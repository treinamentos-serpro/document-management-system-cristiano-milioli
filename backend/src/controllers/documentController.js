class DocumentController {
  constructor(documentService) {
    this.documentService = documentService;
  }

  upload = (req, res, next) => {
    try {
      const document = this.documentService.upload(req.file, req.header('x-user-id'));
      res.status(201).json({ document: this.documentService.toPublic(document) });
    } catch (error) {
      next(error);
    }
  };

  list = (req, res, next) => {
    try {
      const documents = this.documentService.list(req.header('x-user-id'));
      res.json({ documents });
    } catch (error) {
      next(error);
    }
  };

  download = (req, res, next) => {
    try {
      const document = this.documentService.findForDownload(req.params.id, req.header('x-user-id'));
      res.type(document.mimeType).download(document.storagePath, document.originalName, (error) => {
        if (error && !res.headersSent) {
          next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = DocumentController;