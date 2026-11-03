import type { OfficeContentNode } from "officeparser";

const ORDER_STATUS_VALUES = [
    "cancelled",
    "canceled",
    "completed",
    "delivered",
    "pending",
    "processing",
    "returned",
    "shipped",
] as const;

function canonicalStatus(status: string): string {
    return status === "canceled" ? "cancelled" : status;
}

export function requestedStatus(question: string): string | null {
    if (/\b(?:not|excluding|except|other than)\b/i.test(question)) return null;

    const statuses = [...question.matchAll(
        new RegExp(`\\b(${ORDER_STATUS_VALUES.join("|")})\\b`, "gi"),
    )].map(match => canonicalStatus(match[1].toLowerCase()));
    const uniqueStatuses = [...new Set(statuses)];
    return uniqueStatuses.length === 1 ? uniqueStatuses[0] : null;
}

export function isOrderStatusReport(question: string): boolean {
    return /\b(?:report|breakdown|by\s+status|all\s+types|each\s+status|all\s+statuses)\b/i.test(question) &&
        /\borders?\b/i.test(question) &&
        /\b(?:cost|price|value|amount|revenue|spend|count|how many|number of)\b/i.test(question);
}

function normalizedHeader(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sheetRows(sheet: OfficeContentNode): string[][] {
    return (sheet.children ?? [])
        .filter(node => node.type === "row")
        .map(row => {
            const cells = (row.children ?? [])
                .filter(cell => cell.type === "cell")
                .map(cell => ({
                    column: cell.metadata?.col,
                    value: cell.text?.trim() ?? "",
                }))
                .sort((a, b) => (a.column ?? 0) - (b.column ?? 0));

            const values: string[] = [];
            cells.forEach((cell, index) => {
                values[cell.column ?? index] = cell.value;
            });
            return values;
        });
}

export function countMatchingOrders(sheet: OfficeContentNode, status: string): number | null {
    return aggregateMatchingOrders(sheet, status)?.count ?? null;
}

export interface OrderAggregate {
    count: number;
    totalCost: number | null;
}

interface OrderColumns {
    rows: string[][];
    orderColumn: number;
    statusColumn: number;
    totalColumn: number;
    quantityColumn: number;
    unitPriceColumn: number;
    firstDataRow: number;
}

function findOrderColumns(sheet: OfficeContentNode): OrderColumns | null {
    const rows = sheetRows(sheet);
    const headerIndex = rows.findIndex((row, index) => {
        if (index > 20) return false;
        const headers = row.map(normalizedHeader);
        return headers.some(header =>
            header === "order" ||
            header.includes("orderid") ||
            header.includes("ordernumber") ||
            header.includes("orderno"),
        ) && headers.some(header => header === "status" || header.endsWith("status"));
    });

    if (headerIndex < 0) return null;

    const headers = rows[headerIndex].map(normalizedHeader);
    const orderColumn = headers.findIndex(header =>
        header === "order" ||
        header.includes("orderid") ||
        header.includes("ordernumber") ||
        header.includes("orderno"),
    );
    const statusColumn = headers.findIndex(header =>
        header === "status" || header.endsWith("status"),
    );
    const totalColumn = headers.findIndex(header =>
        ["ordertotal", "totalamount", "totalprice", "orderamount", "totalcost", "ordercost", "total", "amount", "revenue", "lineamount"]
            .includes(header),
    );
    const quantityColumn = headers.findIndex(header =>
        ["quantity", "qty", "orderquantity"].includes(header),
    );
    const unitPriceColumn = headers.findIndex(header =>
        ["unitprice", "priceperunit", "price", "costperunit"].includes(header),
    );
    return {
        rows,
        orderColumn,
        statusColumn,
        totalColumn,
        quantityColumn,
        unitPriceColumn,
        firstDataRow: headerIndex + 1,
    };
}

function orderRowCost(row: string[], columns: OrderColumns): number | null {
    if (columns.totalColumn >= 0) return parseAmount(row[columns.totalColumn]);

    const quantity = parseAmount(row[columns.quantityColumn]);
    const unitPrice = parseAmount(row[columns.unitPriceColumn]);
    if (quantity === null || unitPrice === null) return null;
    return quantity * unitPrice;
}

export function aggregateOrderStatuses(
    sheet: OfficeContentNode,
): Map<string, OrderAggregate> | null {
    const columns = findOrderColumns(sheet);
    if (!columns) return null;

    const aggregates = new Map<string, { count: number; totalCost: number; hasCompleteCost: boolean }>();
    for (const row of columns.rows.slice(columns.firstDataRow)) {
        const orderId = row[columns.orderColumn]?.trim() ?? "";
        const status = canonicalStatus(row[columns.statusColumn]?.trim().toLowerCase() ?? "");
        if (!orderId || !status) continue;

        const aggregate = aggregates.get(status) ?? {
            count: 0,
            totalCost: 0,
            hasCompleteCost: columns.totalColumn >= 0 ||
                (columns.quantityColumn >= 0 && columns.unitPriceColumn >= 0),
        };
        aggregate.count++;
        const rowCost = orderRowCost(row, columns);
        if (rowCost === null) {
            aggregate.hasCompleteCost = false;
        } else {
            aggregate.totalCost += rowCost;
        }
        aggregates.set(status, aggregate);
    }

    return new Map([...aggregates].map(([status, aggregate]) => [
        status,
        {
            count: aggregate.count,
            totalCost: aggregate.hasCompleteCost ? aggregate.totalCost : null,
        },
    ]));
}

export function aggregateMatchingOrders(
    sheet: OfficeContentNode,
    status: string,
): OrderAggregate | null {
    const aggregates = aggregateOrderStatuses(sheet);
    return aggregates?.get(canonicalStatus(status)) ?? null;
}

function parseAmount(value?: string): number | null {
    if (!value?.trim()) return null;
    const normalized = value.replace(/,/g, "").replace(/[$€£¥\s]/g, "");
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
}
