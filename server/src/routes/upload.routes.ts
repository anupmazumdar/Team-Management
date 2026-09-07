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

// Safe file extension and MIME type allowlists
const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]);

const DANGEROUS_EXTENSIONS = new Set([
  '.svg',
  '.html',
  '.htm',
  '.xhtml',
  '.xml',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.php',
  '.phtml',
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.py',
]);

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  // Explicitly reject scripts, HTML, SVG, executables
  if (DANGEROUS_EXTENSIONS.has(ext) || mime.includes('svg') || mime.includes('html') || mime.includes('javascript')) {
    return cb(new Error(`File type rejected: ${ext || mime} files are not permitted for security reasons.`));
  }

  // Validate against allowlists
  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
    return cb(new Error(`Unsupported file type: "${ext || mime}". Allowed files include images (JPEG, PNG, WebP, GIF), PDFs, and documents.`));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter,
});

// Upload attachment
uploadRouter.post(
  '/',
  (req: Request, res: Response, next: (err?: any) => void) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || 'File rejected by upload security filter.' });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
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
