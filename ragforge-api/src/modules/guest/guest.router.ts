import { Router } from "express";
import multer from "multer";
import { BadRequestError } from "../../common/errors/index.js";
import { authRateLimit, chatRateLimit, uploadRateLimit } from "../../common/middleware/rate-limit.middleware.js";
import { getSupportedDocumentExtension } from "../documents/documents.constants.js";
import { GuestController, MAX_GUEST_FILE_SIZE } from "./guest.controller.js";
import { guestSessionMiddleware } from "./guest-session.middleware.js";

const router = Router();
const controller = new GuestController();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_GUEST_FILE_SIZE, files: 1 },
    fileFilter: (_req, file, callback) => {
        if (getSupportedDocumentExtension(file.originalname)) {
            callback(null, true);
        } else {
            callback(new BadRequestError("Unsupported file type. Upload PDF, Office, OpenDocument, or supported text files."));
        }
    },
});

router.post("/session", authRateLimit, controller.createSession);
router.use(guestSessionMiddleware);
router.post("/documents/upload", uploadRateLimit, upload.single("file"), controller.upload);
router.get("/documents", controller.listDocuments);
router.delete("/documents/:id", controller.deleteDocument);
router.delete("/session/data", controller.deleteAllData);
router.get("/conversations/:id", controller.getConversation);
router.post("/chat", chatRateLimit, controller.chatMessage);
router.post("/chat/stream", chatRateLimit, controller.streamChatMessage);

export default router;
