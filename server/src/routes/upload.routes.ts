import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

export const uploadRouter = Router();

uploadRouter.use(authenticateToken);

// Configure local disk storage directory
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Upload attachment
uploadRouter.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { taskId, messageId } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;

    const attachment = await prisma.attachment.create({
      data: {
        taskId: taskId || null,
        messageId: messageId || null,
        uploaderId: req.user!.id,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
      include: {
        uploader: {
          select: { id: true, fullName: true },
        },
      },
    });

    return res.status(201).json(attachment);
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: 'Failed to save attachment.' });
  }
});
