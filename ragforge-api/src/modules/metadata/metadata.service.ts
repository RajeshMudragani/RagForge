import { MetadataRepository } from "./metadata.repository.js";

export class MetadataService {

    private readonly repository = new MetadataRepository();

    async add(
        documentId: string,
        key: string,
        value: string,
    ) {
        return this.repository.add(
            documentId,
            key,
            value,
        );
    }

    async bulkAdd(
        documentId: string,
        metadata: Record<
            string,
            string
        >,
    ) {
        return this.repository.bulkAdd(
            documentId,
            metadata,
        );
    }

    async getDocumentMetadata(
        documentId: string,
    ) {
        return this.repository.findByDocumentId(
            documentId,
        );
    }

    async delete(
        documentId: string,
        key: string,
    ) {
        return this.repository.delete(
            documentId,
            key,
        );
    }
}
