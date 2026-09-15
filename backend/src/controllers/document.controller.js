const fs = require('node:fs/promises');

class DocumentController {
  constructor(documentService) {
    this.documentService = documentService;
  }

  upload = (req, res, next) => {
    try {
      const document = this.documentService.upload(req.file, req.header('x-user-id'));
      res.status(201).json({ document: this.documentService.toPublic(document) });
    } catch (error) {
      if (req.file?.path) {
        fs.unlink(req.file.path).catch(() => {});
      }
      next(error);
    }
  };

  list = (req, res, next) => {
    try {
      res.json({ documents: this.documentService.list(req.header('x-user-id')) });
    } catch (error) {
      next(error);
    }
  };

  download = (req, res, next) => {
    try {
      const document = this.documentService.findForDownload(req.params.id, req.header('x-user-id'));
      res.type(document.mimeType).download(document.storagePath, document.originalName, (error) => {
        if (error && !res.headersSent) {
          const fileError = new Error('Arquivo do documento não encontrado.');
          fileError.code = error.code === 'ENOENT' ? 'DOCUMENT_FILE_NOT_FOUND' : 'STORAGE_READ_FAILED';
          fileError.status = error.code === 'ENOENT' ? 404 : 500;
          next(fileError);
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = DocumentController;