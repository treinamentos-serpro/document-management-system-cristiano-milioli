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

const storage = multer.diskStorage({
  destination: storageDirectory,
  filename: (req, file, callback) => {
    callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024) },
});

const documentService = new DocumentService(new DocumentRepository());
const documentController = new DocumentController(documentService);
const router = express.Router();

router.post('/upload', upload.single('file'), documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;