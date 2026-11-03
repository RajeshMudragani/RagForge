import { PDFParse } from "pdf-parse";
import { OfficeParser } from "officeparser";
import type { SupportedFileType } from "officeparser";
import type { SupportedDocumentExtension } from "../documents/documents.constants.js";
import { ExtractionResult } from "./interfaces/extraction-result.interface.js";

const OFFICE_PARSER_EXTENSIONS = [
    "docx", "pptx", "xlsx", "odt", "odp", "ods", "odg", "rtf",
    "md", "html", "csv", "epub", "tex",
] as const satisfies readonly SupportedFileType[];

type OfficeParserExtension = typeof OFFICE_PARSER_EXTENSIONS[number];

function isOfficeParserExtension(extension: SupportedDocumentExtension): extension is OfficeParserExtension {
    return (OFFICE_PARSER_EXTENSIONS as readonly string[]).includes(extension);
}

export class ExtractionService {
    async extract(
        buffer: Buffer,
        extension: SupportedDocumentExtension,
    ): Promise<ExtractionResult> {
        if (extension === "pdf") {
            return this.extractPdf(buffer);
        }

        const officeParserType = extension === "htm"
            ? "html"
            : isOfficeParserExtension(extension) ? extension : null;
        if (officeParserType) {
            const ast = await OfficeParser.parseOffice(buffer, { fileType: officeParserType });
            const { value } = await ast.to("text");
            return { text: this.normalizeText(value), pageCount: 0 };
        }

        let text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
        return { text: this.normalizeText(text), pageCount: 0 };
    }

    async extractPdf(
        buffer: Buffer,
    ): Promise<ExtractionResult> {
        const parser = new PDFParse({
            data: buffer,
        });

        try {
            const result = await parser.getText();

            return {
                text: this.normalizeText(result.text),
                pageCount: result.total,
            };
        } finally {
            await parser.destroy();
        }
    }

    private normalizeText(text: string): string {
        return text
            .replace(/\r/g, "")
            .replace(/\t/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }
}