import { Readable } from 'stream';
import { IUser } from '../Entities/auth-and-user/IUser';
import { FileManager } from '../../Entities/FileManager';

export interface IFileService {

  uploadFile(userId: string, file: Express.Multer.File): Promise<FileManager>;

  /**
   * Formats a file based on its type and performs specific actions (e.g., email or image processing).
   * @param Body - The file's content as a readable stream.
   * @param ContentType - The MIME type of the file.
   * @param fileKey - The key or name of the file.
   * @returns The processed file content.
   */
  fileFormatter(Body: Readable, ContentType: string, fileKey: string): Promise<Readable>;

  /**
   * Saves file metadata to the database asynchronously.
   * @param userId - The ID of the user associated with the file.
   * @param fileType - The type of the file.
   * @param uploadPurpose - The purpose of the file upload.
   * @param fileKeyData - An optional tuple of directory name and file key.
   * @returns A promise resolving to the file metadata stored in the database.
   */
  saveFileMetaDataToDatabaseAsync(userId: string, fileType: string, uploadPurpose: string, fileName: string, fileUrl: string): Promise<FileManager> 

  /**
   * Validates the file type.
   * @param fileType - The type of the file to validate.
   * @throws ValidationError if the file type is invalid.
   */
  validateFileType(fileType: string): void;

  /**
   * Validates if a file is of an allowed image type.
   * @param fileType - The type of the image file to validate.
   * @throws ValidationError if the image type is invalid.
   */
  validateImageType(fileType: string): void;

  /**
   * Validates the size of a file.
   * @param fileSize - The size of the file in bytes.
   * @param allowedFileSize - The maximum allowed file size in megabytes (default is 5 MB).
   * @throws ValidationError if the file size exceeds the allowed limit.
   */
  validateFileSize(fileSize: number, allowedFileSize?: number): void;
}

// Supporting types used in the interface
// interface FileManager {
//   create(fileData: FileData): void;
// }

// interface FileData {
//   key: string;
//   userId: string;
//   uploadPurpose: UploadPurpose;
//   bucketName: BucketName;
//   contentType: string;
//   createdTime: number;
// }

enum UploadPurpose {
  Verification = 'Verification',
  Profile = 'Profile',
  CarImage = 'CarImage',
}

enum BucketName {
  VERIFICATION = 'verification-bucket',
  PROFILE = 'profile-bucket',
  CAR_IMAGE = 'car-image-bucket',
}

const allowedFileTypes = ['image/jpeg', 'image/png', 'text/html'];
const allowedImageFileTypes = ['image/jpeg', 'image/png'];
