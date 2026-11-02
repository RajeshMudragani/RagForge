import { Router } from "express";
import { MetadataController } from "./metadata.controller.js";

const router = Router();

const controller = new MetadataController();

router.post("/documents/:id/metadata", controller.add);

router.post("/documents/:id/metadata/bulk", controller.bulkAdd);

router.get("/documents/:id/metadata", controller.getDocumentMetadata);

router.delete("/documents/:id/metadata/:key", controller.delete);

export default router;