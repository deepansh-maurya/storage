import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

class StorageService {
  private static instance: StorageService;
  private basePath = path.join(process.cwd(), 'upload');

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async uploadFile(
    file: Express.Multer.File,
    storageKey: string,
    meta?: Record<string, string>,
  ) {
    const fullPath = path.join(this.basePath, storageKey);

    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });

    const readable = Readable.from(file.buffer);

    const writeStream = fs.createWriteStream(fullPath);

    await pipeline(readable, writeStream);

    return {
      storageKey,
      size: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
    };
  }

  async getFileReadStream(storageKey: string): Promise<Readable> {
    const fullPath = path.join(this.basePath, storageKey);

    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);

      return fs.createReadStream(fullPath);
    } catch (error) {
      throw new Error(`File not found or not readable: ${storageKey}`);
    }
  }
}

export default StorageService;
