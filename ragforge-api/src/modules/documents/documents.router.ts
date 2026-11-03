import { Router } from "express";
import multer from "multer";

import { DocumentsController } from "./documents.controller.js";
import { getSupportedDocumentExtension, UPLOAD_MAX_FILE_SIZE } from "./documents.constants.js";
import { authMiddleware } from "../auth/middleware/auth.middleware.js";
import { tenantMiddleware } from "../auth/middleware/tenant.middleware.js";
import { BadRequestError } from "../../common/errors/index.js";

const router = Router();
const controller = new DocumentsController();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: UPLOAD_MAX_FILE_SIZE,
    },
    fileFilter: (_req, file, callback) => {
        if (getSupportedDocumentExtension(file.originalname)) {
            callback(null, true);
        } else {
            callback(new BadRequestError("Unsupported file type. Upload PDF, Office, OpenDocument, or supported text files."));
        }
    },
});

router.use(authMiddleware, tenantMiddleware);

router.post("/upload", upload.single("file"), controller.upload);
router.patch("/assign-collection", controller.assignCollection);
router.get("/events", controller.streamEvents);
router.get("/", controller.findAll);
router.patch("/:id", controller.update);
router.delete("/:id", controller.delete);
router.get("/:id", controller.findById);
router.post("/:id/process", controller.process);
router.get("/:id/status", controller.getStatus);

export default router;
