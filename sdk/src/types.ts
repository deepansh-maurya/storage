import NodeFormData from "form-data";

export interface UploadNestClientOptions {
  apiKey: string;
  isBrowser?: boolean;
}

export type UploadInput = File | Blob | Buffer | string;

export interface UploadResponseType {
  message: string;
  data: {
    fileId: string;
    originalName: string;
    size: number;
    ext: string;
    mimeType: string;
  }[];
}

export interface UploadRequestOptions {
  method: string;
  headers: Record<string, string>;
  body: FormData | NodeFormData;
}
