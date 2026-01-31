import path from 'path';
import { PassThrough } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import FileModel, { UploadSourceEnum } from '../models/file.model';
import UserModel from '../models/user.model';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from '../utils/app-error';
import { sanitizeFilename } from '../utils/helper';
import StorageService from '../storage/StorageService';
import mongoose from 'mongoose';

export const uploadFilesService = async (
  userId: string,
  files: Express.Multer.File[],
  uploadedVia: keyof typeof UploadSourceEnum,
  wId: string,
) => {
  const user = await UserModel.findOne({ _id: userId });
  if (!user) throw new UnauthorizedException('Unauthorized access');
  if (!files?.length) throw new BadRequestException('No files provided');

  const results = await Promise.allSettled(
    files.map(async (file) => {
      let _storageKey: string | null = null;
      try {
        const { storageKey } = await uploadToS3(file, userId, wId);
        _storageKey = storageKey;
        const createdFile = await FileModel.create({
          userId,
          storageKey,
          originalName: file.originalname,
          uploadVia: uploadedVia,
          size: file.size,
          ext: path.extname(file.originalname)?.slice(1)?.toLowerCase(),
          url: '',
          mimeType: file.mimetype,
        });

        return {
          fileId: createdFile._id,
          originalName: createdFile.originalName,
          size: createdFile.size,
          ext: createdFile.ext,
          mimeType: createdFile.mimeType,
        };
      } catch (error) {
        console.error('Error uploading file', error);
        if (_storageKey) {
          //delete from s3 bucket
        }
        throw error;
      }
    }),
  );

  const successfulRes = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  const failedRes = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason.message);

  if (failedRes.length > 0) {
    console.warn('Failed to upload files', files);
  }

  return {
    message: `Uploaded successfully ${successfulRes.length} out of ${files.length} files`,
    data: successfulRes,
    failedCount: failedRes.length,
  };
};

export const getAllFilesService = async (
  userId: string,
  filter: {
    keyword?: string;
  },  
  pagination: { pageSize: number; pageNumber: number },
) => {
  const { keyword } = filter;

  const filterConditons: Record<string, any> = {
    userId,
  };

  if (keyword) {
    filterConditons.$or = [
      {
        originalName: {
          $regex: keyword,
          $options: 'i',
        },
      },
    ];
  }

  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [files, totalCount] = await Promise.all([
    FileModel.find(filterConditons)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 }),
    FileModel.countDocuments(filterConditons),
  ]);

  // console.log({ files, totalCount });

  const filesWithUrls = await Promise.all(
    files.map(async (file) => {
      const url = await getFileFromS3({
        storageKey: file.storageKey,
        mimeType: file.mimeType,
        expiresIn: 3600,
      });

      return {
        ...file.toObject(),
        url,
        storageKey: undefined,
      };
    }),
  );

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    files: filesWithUrls,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};

export const getFileUrlService = async (fileId: string) => {
  const file = await FileModel.findOne({ _id: fileId });
  if (!file) throw new NotFoundException('File not found');
  const stream = await getS3ReadStream(file.storageKey);

  return {
    url: '',
    stream,
    contentType: file.mimeType,
    fileSize: file.size,
  };
};

export const deleteFilesService = async (
  userId: string,
  fileIds: string[],
): Promise<any> => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const files = await FileModel.find({
        _id: { $in: fileIds },
        userId,
      }).session(session);
      if (!files.length) throw new NotFoundException('No files found');

      const s3Errors: string[] = [];

      await Promise.all(
        files.map(async (file) => {
          try {
            await deleteFromS3(file.storageKey);
          } catch (error) {
            console.error(`Failed to delete ${file.storageKey} from s3`, error);
            s3Errors.push(file.storageKey);
          }
        }),
      );
      const successfulFileIds = files
        .filter((file) => !s3Errors.includes(file.storageKey))
        .map((file) => file._id);

      const { deletedCount } = await FileModel.deleteMany({
        _id: { $in: successfulFileIds },
        userId,
      }).session(session);

      if (s3Errors.length > 0) {
        console.warn(`Failed to delete ${s3Errors.length} files form S3`);
      }

      result = {
        deletedCount,
        failedCount: s3Errors.length,
      };
    });
    return result;
  } catch (error) {
    throw error;
  } finally {
    await session.endSession();
  }
};

export const downloadFilesService = async (
  userId: string,
  fileIds: string[],
) => {
  const files = await FileModel.find({
    _id: { $in: fileIds },
    userId,
  });
  if (!files.length) throw new NotFoundException('No files found');

  if (files.length === 1) {
    const signedUrl = await getFileFromS3({
      storageKey: files[0].storageKey,
      filename: files[0].originalName,
    });

    return {
      url: signedUrl,
      isZip: false,
    };
  }

  const url = await handleMultipleFilesDownload(files, userId);

  return {
    url,
    isZip: true,
  };
};

async function handleMultipleFilesDownload(
  files: Array<{ storageKey: string; originalName: string }>,
  userId: string,
) {
  const storageService = StorageService.getInstance;

  const timestamp = Date.now();

  const zipStorageKey = `temp-zips/${userId}/${timestamp}.zip`;
  const zipFilename = `uploadnest-${timestamp}.zip`;

  const zip = archiver('zip', { zlib: { level: 6 } });
  const passThrough = new PassThrough();

  zip.on('error', (err) => {
    passThrough.destroy(err);
  });

  zip.pipe(passThrough);

  const uploadPromise = storageService.uploadFile(
    {
      buffer: Buffer.alloc(0),
      originalname: zipFilename,
      mimetype: 'application/zip',
      size: 0,
    } as any,
    zipStorageKey,
  );

  // append files into zip
  for (const file of files) {
    try {
      const stream = await storageService.getFileReadStream(file.storageKey);
      zip.append(stream, {
        name: sanitizeFilename(file.originalName),
      });
    } catch (error) {
      zip.destroy(error as Error);
      throw error;
    }
  }

  await zip.finalize();
  await uploadPromise;

  // 🔹 generate signed URL using your backend
  const url = storageService.getSignedFileUrl({
    storageKey: zipStorageKey,
    filename: zipFilename,
    expiresIn: 3600,
    mimeType: 'application/zip',
  });

  return url;
}

// pure handlers

async function uploadToS3(
  file: Express.Multer.File,
  userId: string,
  wId: string,
  meta?: Record<string, string>,
) {
  try {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);

    const cleanName = sanitizeFilename(basename).substring(0, 64);

    const storageKey = `workspace/${wId}users/${userId}/${uuidv4()}-${cleanName}${ext}`;
    await StorageService.getInstance.uploadFile(file, storageKey);

    return {
      storageKey,
    };
  } catch (error) {
    console.error('AWS Error Failed upload', error);
    throw error;
  }
}

async function getFileFromS3({
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
  try {
    return await StorageService.getInstance.getSignedFileUrl({
      storageKey,
      filename,
      mimeType,
      expiresIn,
    });
  } catch (error) {
    console.error(`Failed to get file from S3: ${storageKey}`);
    throw error;
  }
}

async function getS3ReadStream(storageKey: string) {
  try {
    return await StorageService.getInstance.getFileReadStream(storageKey);
  } catch (error) {
    console.error(`Error getting s3 stream for key: ${storageKey}`);
    throw new InternalServerException(`Failed to retrieve file`);
  }
}

async function deleteFromS3(storageKey: string) {
  try {
    await StorageService.getInstance.deleteFile(storageKey);
  } catch (error) {
    console.error(`Failed to delete file from S3`, storageKey);
    throw error;
  }
}
