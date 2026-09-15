const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { createMultipartBody, request, startServer } = require('./helpers/http');
const { listStorageFiles, removeNewStorageFiles } = require('./helpers/storage');

test('faz upload, lista e baixa um documento do usuário', async () => {
  const server = await startServer(app);
  const owner = `test-user-${Date.now()}`;
  const fileContent = 'conteúdo de teste do DMS';
  const filesBefore = await listStorageFiles();

  try {
    const uploadResponse = await request(server, { method: 'POST', path: '/upload', headers: { 'x-user-id': owner }, body: createMultipartBody('document.txt', fileContent) });
    const uploadPayload = JSON.parse(uploadResponse.body);
    assert.equal(uploadResponse.statusCode, 201);
    assert.equal(uploadPayload.document.originalName, 'document.txt');
    assert.equal(uploadPayload.document.size, Buffer.byteLength(fileContent));
    assert.equal(uploadPayload.document.owner, owner);
    assert.match(uploadPayload.document.id, /^[0-9a-f-]{36}$/i);

    const listResponse = await request(server, { method: 'GET', path: '/documents', headers: { 'x-user-id': owner } });
    const listPayload = JSON.parse(listResponse.body);
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listPayload.documents.length, 1);
    assert.equal(listPayload.documents[0].id, uploadPayload.document.id);

    const downloadResponse = await request(server, { method: 'GET', path: `/documents/${uploadPayload.document.id}/download`, headers: { 'x-user-id': owner } });
    assert.equal(downloadResponse.statusCode, 200);
    assert.equal(downloadResponse.body, fileContent);
    assert.match(downloadResponse.headers['content-disposition'], /attachment/);
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
    const uploadResponse = await request(server, { method: 'POST', path: '/upload', headers: { 'x-user-id': owner }, body: createMultipartBody('private.txt', 'conteúdo privado') });
    const documentId = JSON.parse(uploadResponse.body).document.id;
    const response = await request(server, { method: 'GET', path: `/documents/${documentId}/download`, headers: { 'x-user-id': 'another-user' } });
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