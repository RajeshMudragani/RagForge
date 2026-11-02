import { PDFParse } from "pdf-parse";
import { ExtractionResult } from "./interfaces/extraction-result.interface.js";

export class ExtractionService {
    async extractPdf(
        buffer: Buffer,
    ): Promise<ExtractionResult> {
        const parser = new PDFParse({
            data: buffer,
        });

        try {
            const result = await parser.getText();

            return {
                text: result.text
                    .replace(/\r/g, "")
                    .replace(/\t/g, " ")
                    .replace(/\n{3,}/g, "\n\n")
                    .trim(),

                pageCount: result.total,
            };
        } finally {
            await parser.destroy();
        }
    }
}