const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.resolve(__dirname, '../../storage');

async function listStorageFiles() {
  try {
    return new Set(await fs.readdir(storageDirectory));
  } catch (error) {
    if (error.code === 'ENOENT') return new Set();
    throw error;
  }
}

async function removeNewStorageFiles(filesBefore) {
  const filesAfter = await listStorageFiles();
  await Promise.all([...filesAfter].filter((fileName) => !filesBefore.has(fileName)).map((fileName) => fs.unlink(path.join(storageDirectory, fileName))));
}

module.exports = { listStorageFiles, removeNewStorageFiles };