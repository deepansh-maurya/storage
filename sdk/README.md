# @uploadnest/sdk

[![NPM version](https://img.shields.io/npm/v/@uploadnest/sdk.svg)](https://npmjs.org/package/@uploadnest/sdk)
![Bundle Size](https://img.shields.io/bundlephobia/minzip/@uploadnest/sdk)

TypeScript library for uploading files to Uploadnest API. Works in Node.js, Next.js, and browsers.

## Installation

```bash
npm install @uploadnest/sdk
# or
pnpm add @uploadnest/sdk
```

## Quick Start

```typescript
import { UploadNestClient } from "@uploadnest/sdk";

const client = new UploadNestClient({
  apiKey: "your-api-key",
});

// Upload files
const result = await client.uploadFiles(files);
console.log(result.files);
```

## Usage Examples

### Node.js - File Paths

```typescript
// Upload from file path
await client.uploadFiles("/path/to/file.jpg");

// Multiple files
await client.uploadFiles(["/path/to/file1.jpg", "/path/to/file2.pdf"]);
```

### Node.js - Buffers

```typescript
import fs from "fs";

const buffer = fs.readFileSync("image.jpg");
// Add metadata to buffer
buffer.name = "image.jpg";
buffer.type = "image/jpeg";

await client.uploadFiles(buffer);
```

### Browser/Next.js - File Objects

```typescript
// From file input
const fileInput = document.querySelector('input[type="file"]');
await client.uploadFiles(fileInput.files[0]);

// Multiple files
await client.uploadFiles(Array.from(fileInput.files));
```

### Next.js Server Actions

```typescript
// app/upload/page.tsx
import { UploadNestClient } from "@uploadnest/sdk";

async function uploadAction(formData: FormData) {
  "use server";

  const client = new UploadNestClient({
    apiKey: process.env.UPLOADNEST_API_KEY!,
    isBrowser: true,
  });

  const file = formData.get("file") as File;
  const result = await client.uploadFiles(file);

  return result;
}
```

## Supported File Types

- **Node.js**: File paths (strings), Buffers
- **Browser**: File objects, Blob objects
- **Next.js**: File objects, Blob objects (server actions/API routes)

## Error Handling

```typescript
import { ValidationError, UploadError } from "@uploadnest/sdk/errors";

try {
  await client.uploadFiles(files);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log("Invalid file type:", error.message);
  } else if (error instanceof UploadError) {
    console.log("Upload failed:", error.message);
  }
}
```

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import type { UploadFileResponse } from "@uploadnest/sdk/types";

const result: UploadFileResponse = await client.uploadFiles(files);
```

## Requirements

- **Node.js**: 18+
- **TypeScript**: 4.5+ (optional)
- **Browsers**: Modern browsers with fetch support
- **Next.js**: 13+ (App Router recommended)

## License

Apache-2.0
