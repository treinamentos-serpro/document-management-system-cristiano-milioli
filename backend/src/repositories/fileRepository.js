const fs = require('node:fs/promises');

class FileRepository {
  async remove(filePath) {
    await fs.unlink(filePath);
  }
}

module.exports = FileRepository;