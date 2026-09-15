const path = require('node:path');
const { randomUUID } = require('node:crypto');

class DocumentService {
  constructor(documentRepository) {
    this.documentRepository = documentRepository;
  }

  upload(file, owner) {
    this.ensureOwner(owner);
    if (!file) {
      throw this.createError('FILE_REQUIRED', 'Arquivo é obrigatório.', 400);
    }

    return this.documentRepository.save({
      id: randomUUID(),
      originalName: path.basename(file.originalname),
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner: owner.trim(),
      storagePath: file.path,
      mimeType: file.mimetype || 'application/octet-stream',
    });
  }

  list(owner) {
    this.ensureOwner(owner);
    return this.documentRepository.findByOwner(owner.trim()).map((document) => this.toPublic(document));
  }

  findForDownload(id, owner) {
    this.ensureOwner(owner);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      throw this.createError('INVALID_DOCUMENT_ID', 'Identificador do documento é inválido.', 400);
    }

    const document = this.documentRepository.findById(id);
    if (!document) {
      throw this.createError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.', 404);
    }
    if (document.owner !== owner.trim()) {
      throw this.createError('DOCUMENT_ACCESS_DENIED', 'Acesso ao documento negado.', 403);
    }

    return document;
  }

  toPublic(document) {
    const { storagePath, mimeType, ...metadata } = document;
    return metadata;
  }

  ensureOwner(owner) {
    if (!owner || typeof owner !== 'string' || !owner.trim()) {
      throw this.createError('INVALID_OWNER', 'Identificador do usuário é obrigatório.', 400);
    }
  }

  createError(code, message, status) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
  }
}

module.exports = DocumentService;