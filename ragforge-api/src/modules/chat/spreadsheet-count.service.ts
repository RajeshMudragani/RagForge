import { OfficeParser, type SupportedFileType } from "officeparser";
import { MinioService } from "../../storage/minio/minio.service.js";
import { SpreadsheetCountRepository } from "./spreadsheet-count.repository.js";
import { ChatResponse } from "./interfaces/chat-response.interface.js";
import {
    aggregateMatchingOrders,
    aggregateOrderStatuses,
    isOrderStatusReport,
    requestedStatus,
    type OrderAggregate,
} from "./spreadsheet-count.utils.js";

interface SpreadsheetCountResult {
    answer: string;
    sources: ChatResponse["sources"];
}

function parseFileType(filename: string): SupportedFileType | null {
    const extension = filename.split(".").pop()?.toLowerCase();
    return extension === "xlsx" || extension === "ods" || extension === "csv"
        ? extension
        : null;
}

export class SpreadsheetCountService {
    private readonly repository = new SpreadsheetCountRepository();
    private readonly minio = new MinioService();

    async countOrdersByStatus(
        question: string,
        tenantId: string,
        collectionName?: string,
        metadata?: Record<string, string>,
    ): Promise<SpreadsheetCountResult | null> {
        if (isOrderStatusReport(question)) {
            return this.buildOrderStatusReport(
                tenantId,
                collectionName,
                metadata,
            );
        }

        const status = requestedStatus(question);
        if (!status) return null;
        const asksForCost = /\b(?:cost|price|value|amount|revenue|spend)\b/i.test(question);

        const documents = await this.repository.findForTenant(
            tenantId,
            collectionName,
            metadata,
        );
        const sources: ChatResponse["sources"] = [];
        let totalCount = 0;
        let totalCost = 0;
        let hasCompleteCost = true;
        let foundMatchingSheet = false;

        for (const document of documents) {
            const fileType = parseFileType(document.filename);
            if (!fileType) continue;

            const buffer = await this.minio.downloadObjectAsBuffer(document.storageKey);
            const workbook = await OfficeParser.parseOffice(buffer, { fileType });
            let documentMatched = false;

            for (const sheet of workbook.content.filter(node => node.type === "sheet")) {
                const aggregate = aggregateMatchingOrders(sheet, status);
                if (aggregate === null) continue;

                foundMatchingSheet = true;
                documentMatched = true;
                totalCount += aggregate.count;
                if (aggregate.totalCost === null) {
                    hasCompleteCost = false;
                } else {
                    totalCost += aggregate.totalCost;
                }
            }

            if (documentMatched) {
                sources.push({
                    documentId: document.id,
                    filename: document.filename,
                    chunkIndex: -1,
                    similarity: 1,
                });
            }
        }

        if (!foundMatchingSheet) return null;

        return {
            answer: asksForCost
                ? hasCompleteCost
                    ? `The total cost of ${totalCount} ${status} order${totalCount === 1 ? "" : "s"} is ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
                    : `I found ${totalCount} ${status} order${totalCount === 1 ? "" : "s"}, but couldn't calculate their total because the spreadsheet is missing a usable total amount or quantity and unit price for every matching row.`
                : `There ${totalCount === 1 ? "is" : "are"} ${totalCount} ${status} order${totalCount === 1 ? "" : "s"} across the matching spreadsheet rows.`,
            sources,
        };
    }

    private async buildOrderStatusReport(
        tenantId: string,
        collectionName?: string,
        metadata?: Record<string, string>,
    ): Promise<SpreadsheetCountResult | null> {
        const documents = await this.repository.findForTenant(
            tenantId,
            collectionName,
            metadata,
        );
        const totals = new Map<string, { count: number; totalCost: number; hasCompleteCost: boolean }>();
        const sources: ChatResponse["sources"] = [];

        for (const document of documents) {
            const fileType = parseFileType(document.filename);
            if (!fileType) continue;

            const buffer = await this.minio.downloadObjectAsBuffer(document.storageKey);
            const workbook = await OfficeParser.parseOffice(buffer, { fileType });
            let documentMatched = false;

            for (const sheet of workbook.content.filter(node => node.type === "sheet")) {
                const aggregates = aggregateOrderStatuses(sheet);
                if (!aggregates) continue;

                documentMatched = true;
                for (const [status, aggregate] of aggregates) {
                    mergeAggregate(totals, status, aggregate);
                }
            }

            if (documentMatched) {
                sources.push({
                    documentId: document.id,
                    filename: document.filename,
                    chunkIndex: -1,
                    similarity: 1,
                });
            }
        }

        if (totals.size === 0) return null;

        const report = [...totals.entries()]
            .sort(([statusA], [statusB]) => statusA.localeCompare(statusB))
            .map(([status, aggregate]) => {
                const cost = aggregate.hasCompleteCost
                    ? aggregate.totalCost.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })
                    : "unavailable (missing amount data)";
                return `- ${capitalize(status)}: ${aggregate.count} order${aggregate.count === 1 ? "" : "s"}; total cost ${cost}`;
            });

        return {
            answer: `Order report by status:\n${report.join("\n")}`,
            sources,
        };
    }
}

function mergeAggregate(
    totals: Map<string, { count: number; totalCost: number; hasCompleteCost: boolean }>,
    status: string,
    aggregate: OrderAggregate,
): void {
    const existing = totals.get(status) ?? {
        count: 0,
        totalCost: 0,
        hasCompleteCost: true,
    };
    existing.count += aggregate.count;
    if (aggregate.totalCost === null) {
        existing.hasCompleteCost = false;
    } else {
        existing.totalCost += aggregate.totalCost;
    }
    totals.set(status, existing);
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
