const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { createMultipartBody, request, startServer } = require('./helpers/http');
const { listStorageFiles, removeNewStorageFiles } = require('./helpers/storage');

async function uploadDocument(server, owner, fileName = 'document.txt', fileContent = 'conteúdo de teste do DMS') {
  const response = await request(server, {
    method: 'POST',
    path: '/upload',
    headers: { 'x-user-id': owner },
    body: createMultipartBody(fileName, fileContent),
  });

  return {
    response,
    payload: JSON.parse(response.body),
    fileContent,
  };
}

test('faz upload de um documento do usuário', async () => {
  const server = await startServer(app);
  const owner = `upload-user-${Date.now()}`;
  const fileContent = 'conteúdo de teste do DMS';
  const filesBefore = await listStorageFiles();

  try {
    const { response, payload } = await uploadDocument(server, owner, 'document.txt', fileContent);

    assert.equal(response.statusCode, 201);
    assert.equal(payload.document.originalName, 'document.txt');
    assert.equal(payload.document.size, Buffer.byteLength(fileContent));
    assert.equal(payload.document.owner, owner);
    assert.match(payload.document.id, /^[0-9a-f-]{36}$/i);
  } finally {
    await server.close();
    await removeNewStorageFiles(filesBefore);
  }
});

test('lista os documentos do usuário', async () => {
  const server = await startServer(app);
  const owner = `list-user-${Date.now()}`;
  const filesBefore = await listStorageFiles();

  try {
    const { payload: uploadPayload } = await uploadDocument(server, owner);
    const response = await request(server, {
      method: 'GET',
      path: '/documents',
      headers: { 'x-user-id': owner },
    });
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.documents.length, 1);
    assert.equal(payload.documents[0].id, uploadPayload.document.id);
    assert.equal(payload.documents[0].owner, owner);
  } finally {
    await server.close();
    await removeNewStorageFiles(filesBefore);
  }
});

test('baixa um documento do usuário', async () => {
  const server = await startServer(app);
  const owner = `download-user-${Date.now()}`;
  const filesBefore = await listStorageFiles();

  try {
    const { payload: uploadPayload, fileContent } = await uploadDocument(server, owner);
    const response = await request(server, {
      method: 'GET',
      path: `/documents/${uploadPayload.document.id}/download`,
      headers: { 'x-user-id': owner },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body, fileContent);
    assert.match(response.headers['content-disposition'], /attachment/);
  } finally {
    await server.close();
    await removeNewStorageFiles(filesBefore);
  }
});

test('rejeita upload sem arquivo', async () => {
  const server = await startServer(app);
  try {
    const response = await request(server, { method: 'POST', path: '/upload', headers: { 'x-user-id': 'test-user-without-file' }, body: createMultipartBody() });
    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body).error, { code: 'FILE_REQUIRED', message: 'Arquivo é obrigatório.' });
  } finally {
    await server.close();
  }
});

test('exige um usuário para listar documentos', async () => {
  const server = await startServer(app);
  try {
    const response = await request(server, { method: 'GET', path: '/documents' });
    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error.code, 'INVALID_OWNER');
  } finally {
    await server.close();
  }
});

test('impede que outro usuário baixe o documento', async () => {
  const server = await startServer(app);
  const filesBefore = await listStorageFiles();
  const owner = `owner-${Date.now()}`;
  try {
    const { payload } = await uploadDocument(server, owner, 'private.txt', 'conteúdo privado');
    const response = await request(server, { method: 'GET', path: `/documents/${payload.document.id}/download`, headers: { 'x-user-id': 'another-user' } });
    assert.equal(response.statusCode, 403);
    assert.equal(JSON.parse(response.body).error.code, 'DOCUMENT_ACCESS_DENIED');
  } finally {
    await server.close();
    await removeNewStorageFiles(filesBefore);
  }
});

test('retorna 404 para documento inexistente', async () => {
  const server = await startServer(app);
  try {
    const response = await request(server, { method: 'GET', path: '/documents/00000000-0000-0000-0000-000000000000/download', headers: { 'x-user-id': 'test-user' } });
    assert.equal(response.statusCode, 404);
    assert.equal(JSON.parse(response.body).error.code, 'DOCUMENT_NOT_FOUND');
  } finally {
    await server.close();
  }
});
