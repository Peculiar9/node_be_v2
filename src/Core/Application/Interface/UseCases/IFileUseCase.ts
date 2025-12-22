export interface IFileUseCase {
    /**
     * Upload a single file
     * @param userId User ID
     * @param file File to upload
     * @param uploadPurpose Purpose of the upload
     * @param fileCategory Optional file category
     * @returns Upload result with file URL and metadata
     */
    uploadFile(userId: string, file: Express.Multer.File, uploadPurpose: string, fileCategory?: string): Promise<any>;
}
