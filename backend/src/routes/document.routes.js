const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

const DocumentRepository = require('../repositories/document.repository');
const DocumentService = require('../services/document.service');
const DocumentController = require('../controllers/document.controller');

const storageDirectory = process.env.STORAGE_DIR || path.resolve(__dirname, '../../storage');
fs.mkdirSync(storageDirectory, { recursive: true });

const configuredFileSize = Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024);
const maxFileSize = Number.isSafeInteger(configuredFileSize) && configuredFileSize > 0
  ? configuredFileSize
  : 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: storageDirectory,
  filename: (req, file, callback) => {
    callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, callback) => {
    const allowedTypes = process.env.ALLOWED_MIME_TYPES
      ?.split(',')
      .map((type) => type.trim())
      .filter(Boolean);

    if (allowedTypes?.length && !allowedTypes.includes(file.mimetype)) {
      const error = new Error('Tipo de arquivo não permitido.');
      error.code = 'FILE_TYPE_NOT_ALLOWED';
      error.status = 415;
      return callback(error);
    }

    callback(null, true);
  },
});

const documentService = new DocumentService(new DocumentRepository());
const documentController = new DocumentController(documentService);
const router = express.Router();

const requireOwner = (req, res, next) => {
  if (!req.header('x-user-id')?.trim()) {
    const error = new Error('Identificador do usuário é obrigatório.');
    error.code = 'INVALID_OWNER';
    error.status = 400;
    return next(error);
  }
  next();
};

router.post('/upload', requireOwner, upload.single('file'), documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;