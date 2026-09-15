const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { request, startServer } = require('./helpers/http');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.equal(typeof app, 'function', 'o app Express deve ser uma função');
});

test('retorna o status de saúde da aplicação', async () => {
  const server = await startServer(app);

  try {
    const response = await request(server, { method: 'GET', path: '/health' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { status: 'ok' });
  } finally {
    await server.close();
  }
});
