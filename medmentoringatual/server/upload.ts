import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB
});

const uploadRouter = Router();

uploadRouter.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado" });
      return;
    }

    const suffix = nanoid(8);
    const originalName = req.file.originalname || "file";
    const ext = originalName.split(".").pop() || "bin";
    const menteeId = req.body.menteeId || "shared";
    const pillarId = req.body.pillarId || "0";
    const fileKey = `materiais/${menteeId}/pilar${pillarId}/${suffix}.${ext}`;

    const { url } = await storagePut(fileKey, req.file.buffer, req.file.mimetype);

    res.json({ url, key: fileKey, filename: originalName });
  } catch (err: any) {
    console.error("[Upload] Error:", err);
    res.status(500).json({ error: err.message || "Erro ao fazer upload" });
  }
});

export { uploadRouter };
