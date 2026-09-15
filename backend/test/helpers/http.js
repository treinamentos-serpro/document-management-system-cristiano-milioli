const http = require('node:http');

function startServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => resolve(server));
  });
}

function request(server, options) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const requestOptions = { host: address.address, port: address.port, method: options.method, path: options.path, headers: { ...options.headers, ...(options.body ? { 'content-type': options.body.contentType, 'content-length': options.body.buffer.length } : {}) } };
    const clientRequest = http.request(requestOptions, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ statusCode: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    });
    clientRequest.on('error', reject);
    if (options.body) clientRequest.write(options.body.buffer);
    clientRequest.end();
  });
}

function createMultipartBody(fileName, content = '') {
  const boundary = `----dms-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const filePart = fileName ? `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: text/plain\r\n\r\n${content}\r\n` : '';
  return { buffer: Buffer.from(`${filePart}--${boundary}--\r\n`), contentType: `multipart/form-data; boundary=${boundary}` };
}

module.exports = { createMultipartBody, request, startServer };