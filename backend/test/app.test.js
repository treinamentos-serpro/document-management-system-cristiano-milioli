const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const app = require('../src/app');

const storageDirectory = path.resolve(__dirname, '../storage');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('retorna o status de saúde da aplicação', async () => {
  const server = await startServer();

  try {
    const response = await request(server, { method: 'GET', path: '/health' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { status: 'ok' });
  } finally {
    await server.close();
  }
});

test('faz upload, lista e baixa um documento do usuário', async () => {
  const server = await startServer();
  const owner = `test-user-${Date.now()}`;
  const fileContent = 'conteúdo de teste do DMS';
  const filesBefore = await listStorageFiles();

  try {
    const uploadResponse = await request(server, {
      method: 'POST',
      path: '/upload',
      headers: { 'x-user-id': owner },
      body: createMultipartBody('document.txt', fileContent),
    });
    const uploadPayload = JSON.parse(uploadResponse.body);

    assert.equal(uploadResponse.statusCode, 201);
    assert.equal(uploadPayload.document.originalName, 'document.txt');
    assert.equal(uploadPayload.document.size, Buffer.byteLength(fileContent));
    assert.equal(uploadPayload.document.owner, owner);
    assert.match(uploadPayload.document.id, /^[0-9a-f-]{36}$/i);

    const listResponse = await request(server, {
      method: 'GET',
      path: '/documents',
      headers: { 'x-user-id': owner },
    });
    const listPayload = JSON.parse(listResponse.body);

    assert.equal(listResponse.statusCode, 200);
    assert.equal(listPayload.documents.length, 1);
    assert.equal(listPayload.documents[0].id, uploadPayload.document.id);

    const downloadResponse = await request(server, {
      method: 'GET',
      path: `/documents/${uploadPayload.document.id}/download`,
      headers: { 'x-user-id': owner },
    });

    assert.equal(downloadResponse.statusCode, 200);
    assert.equal(downloadResponse.body, fileContent);
    assert.match(downloadResponse.headers['content-disposition'], /attachment/);
  } finally {
    await server.close();
    await removeNewStorageFiles(filesBefore);
  }
});

test('rejeita upload sem arquivo', async () => {
  const server = await startServer();

  try {
    const response = await request(server, {
      method: 'POST',
      path: '/upload',
      headers: { 'x-user-id': 'test-user-without-file' },
      body: createMultipartBody(),
    });

    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body).error, {
      code: 'FILE_REQUIRED',
      message: 'Arquivo é obrigatório.',
    });
  } finally {
    await server.close();
  }
});

test('exige um usuário para listar documentos', async () => {
  const server = await startServer();

  try {
    const response = await request(server, { method: 'GET', path: '/documents' });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error.code, 'INVALID_OWNER');
  } finally {
    await server.close();
  }
});

test('impede que outro usuário baixe o documento', async () => {
  const server = await startServer();
  const filesBefore = await listStorageFiles();
  const owner = `owner-${Date.now()}`;

  try {
    const uploadResponse = await request(server, {
      method: 'POST',
      path: '/upload',
      headers: { 'x-user-id': owner },
      body: createMultipartBody('private.txt', 'conteúdo privado'),
    });
    const documentId = JSON.parse(uploadResponse.body).document.id;

    const response = await request(server, {
      method: 'GET',
      path: `/documents/${documentId}/download`,
      headers: { 'x-user-id': 'another-user' },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(JSON.parse(response.body).error.code, 'DOCUMENT_ACCESS_DENIED');
  } finally {
    await server.close();
    await removeNewStorageFiles(filesBefore);
  }
});

test('retorna 404 para documento inexistente', async () => {
  const server = await startServer();

  try {
    const response = await request(server, {
      method: 'GET',
      path: `/documents/${'00000000-0000-0000-0000-000000000000'}/download`,
      headers: { 'x-user-id': 'test-user' },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(JSON.parse(response.body).error.code, 'DOCUMENT_NOT_FOUND');
  } finally {
    await server.close();
  }
});

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => resolve(server));
  });
}

function request(server, options) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const requestOptions = {
      host: address.address,
      port: address.port,
      method: options.method,
      path: options.path,
      headers: {
        ...options.headers,
        ...(options.body ? {
          'content-type': options.body.contentType,
          'content-length': options.body.buffer.length,
        } : {}),
      },
    };
    const clientRequest = http.request(requestOptions, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        statusCode: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString(),
      }));
    });

    clientRequest.on('error', reject);
    if (options.body) {
      clientRequest.write(options.body.buffer);
    }
    clientRequest.end();
  });
}

function createMultipartBody(fileName, content = '') {
  const boundary = `----dms-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const filePart = fileName
    ? `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: text/plain\r\n\r\n${content}\r\n`
    : '';
  const buffer = Buffer.from(`${filePart}--${boundary}--\r\n`);
  return { buffer, contentType: `multipart/form-data; boundary=${boundary}` };
}

async function listStorageFiles() {
  try {
    return new Set(await fs.readdir(storageDirectory));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return new Set();
    }
    throw error;
  }
}

async function removeNewStorageFiles(filesBefore) {
  const filesAfter = await listStorageFiles();
  await Promise.all(
    [...filesAfter]
      .filter((fileName) => !filesBefore.has(fileName))
      .map((fileName) => fs.unlink(path.join(storageDirectory, fileName))),
  );
}
