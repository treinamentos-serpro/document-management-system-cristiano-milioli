// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const documentRoutes = require('./routes/document.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(documentRoutes);

// Endpoint de verificação de saúde.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const knownErrors = {
    FILE_TOO_LARGE: { status: 413, message: 'Arquivo excede o limite permitido.' },
    FILE_TYPE_NOT_ALLOWED: { status: 415, message: 'Tipo de arquivo não permitido.' },
    INVALID_OWNER: { status: 400, message: 'Identificador do usuário é obrigatório.' },
    FILE_REQUIRED: { status: 400, message: 'Arquivo é obrigatório.' },
    INVALID_DOCUMENT_ID: { status: 400, message: 'Identificador do documento é inválido.' },
    DOCUMENT_NOT_FOUND: { status: 404, message: 'Documento não encontrado.' },
    DOCUMENT_ACCESS_DENIED: { status: 403, message: 'Acesso ao documento negado.' },
    DOCUMENT_FILE_NOT_FOUND: { status: 404, message: 'Arquivo do documento não encontrado.' },
    STORAGE_READ_FAILED: { status: 500, message: 'Não foi possível ler o documento.' },
  };
  const code = error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : error.code;
  const knownError = knownErrors[code];

  if (!knownError) {
    console.error(error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno.' },
    });
  }

  res.status(knownError.status).json({ error: { code, message: knownError.message } });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
