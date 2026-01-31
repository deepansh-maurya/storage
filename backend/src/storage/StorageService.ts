import fs from 'fs';
import path from 'path';
import * as crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

class StorageService {
  private static instance: StorageService;
  private basePath = path.join(process.cwd(), 'upload');

  private constructor() {}

  static get getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private sign(payload: string) {
    return crypto
      .createHmac('sha256', process.env.SIGNED_URL_SECRET!)
      .update(payload)
      .digest('hex');
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

  getSignedFileUrl({
    storageKey,
    filename,
    mimeType,
    expiresIn = 60,
  }: {
    storageKey: string;
    expiresIn?: number;
    filename?: string;
    mimeType?: string;
  }) {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    // console.log(storageKey, expiresAt);

    const payload = `${storageKey}:${expiresAt}`;

    // console.log({ payload });

    const signature = this.sign(payload);

    const baseUrl = `${process.env.API_BASE_URL}/files/download`;

    // console.log/(baseUrl)

    const url = new URL(baseUrl);
    url.searchParams.set('key', storageKey);
    url.searchParams.set('exp', expiresAt.toString());
    url.searchParams.set('sig', signature);

    if (filename) {
      url.searchParams.set('name', filename);
    }

    if (mimeType) {
      url.searchParams.set('type', mimeType);
    }

    return url.toString();
  }

  async deleteFile(storageKey: string): Promise<void> {
    const fullPath = path.join(this.basePath, storageKey);

    try {
      await fs.promises.unlink(fullPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }
}

export default StorageService;
