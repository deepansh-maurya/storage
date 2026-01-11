import { UnauthorizedError } from "./errors";
import {
  UploadInput,
  UploadNestClientOptions,
  UploadResponseType,
} from "./types";
import { uploadFiles } from "./uploadFile";

const DEFAULT_API_URL = "https://uploadnest.onrender.com/api/v1";

export class UploadNestClient {
  private apiKey: string;
  private isBrowser: boolean;

  constructor(options: UploadNestClientOptions) {
    if (!options.apiKey) throw new UnauthorizedError("API Key is required");
    this.apiKey = options.apiKey;
    this.isBrowser = options.isBrowser || false;
  }

  async uploadFiles(
    files: UploadInput | UploadInput[]
  ): Promise<UploadResponseType> {
    return uploadFiles(files, {
      apiKey: this.apiKey,
      apiUrl: DEFAULT_API_URL,
      isBrowser: this.isBrowser,
    });
  }
}
