/**
 * Interface for media service operations
 */
export interface IMediaService {
    /**
     * Upload a file to the media service
     * @param file File buffer or stream to upload
     * @param options Upload options including folder, public_id, etc.
     * @returns Upload result with URL and metadata
     */
    uploadFile(file: Buffer | string, options?: MediaUploadOptions): Promise<MediaUploadResult>;

    /**
     * Upload multiple files to the media service
     * @param files Array of file buffers or paths to upload
     * @param options Upload options including folder, public_id, etc.
     * @returns Array of upload results with URLs and metadata
     */
    uploadMultipleFiles(files: (Buffer | string)[], options?: MediaUploadOptions): Promise<MediaUploadResult[]>;

    /**
     * Delete a file from the media service
     * @param publicId Public ID of the file to delete
     * @returns Deletion result
     */
    deleteFile(publicId: string): Promise<MediaDeletionResult>;

    /**
     * Generate a transformation URL for an existing image
     * @param publicId Public ID of the image
     * @param transformations Transformation options
     * @returns Transformed image URL
     */
    getTransformedUrl(publicId: string, transformations: ImageTransformation): Promise<string>;
    
    /**
     * Get details of a file
     * @param publicId Public ID of the file
     * @returns File details
     */
    getFileDetails(publicId: string): Promise<MediaFileDetails>;
}

/**
 * Media upload options
 */
export interface MediaUploadOptions {
    /** Folder path to store the file in */
    folder?: string;
    /** Public ID for the file (without file extension) */
    publicId?: string;
    /** Resource type (image, video, raw, etc.) */
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    /** Tags to associate with the file */
    tags?: string[];
    /** Whether the file should be marked as private */
    isPrivate?: boolean;
    /** Access control settings */
    accessControl?: AccessControl[];
    /** Custom transformation to apply during upload */
    transformation?: ImageTransformation;
    /** Additional metadata to store with the file */
    metadata?: Record<string, string>;
}

/**
 * Access control settings
 */
export interface AccessControl {
    /** Access type */
    access_type: 'anonymous' | 'token';
    /** Start time for access (ISO date string) */
    start?: string;
    /** End time for access (ISO date string) */
    end?: string;
}

/**
 * Image transformation options
 */
export interface ImageTransformation {
    /** Width in pixels */
    width?: number;
    /** Height in pixels */
    height?: number;
    /** Crop mode */
    crop?: 'fill' | 'scale' | 'fit' | 'thumb' | 'crop';
    /** Gravity for cropping */
    gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
    /** Quality (1-100) */
    quality?: number;
    /** Format to convert to */
    format?: 'jpg' | 'png' | 'webp' | 'gif' | 'auto';
    /** Whether to fetch from remote URL */
    fetchFormat?: boolean;
    /** Effect to apply */
    effect?: string;
    /** Background color (hex) */
    background?: string;
    /** Border width and color */
    border?: string;
    /** Radius for rounded corners */
    radius?: number | 'max';
    /** Angle for rotation */
    angle?: number;
    /** Opacity (0-100) */
    opacity?: number;
    /** Whether to strip metadata */
    stripMetadata?: boolean;
    /** Custom transformation string */
    custom?: string;
}

/**
 * Media upload result
 */
export interface MediaUploadResult {
    /** Public ID of the uploaded file */
    publicId: string;
    /** URL of the uploaded file */
    url: string;
    /** Secure URL of the uploaded file */
    secureUrl: string;
    /** Original filename */
    originalFilename?: string;
    /** File format */
    format: string;
    /** File size in bytes */
    bytes: number;
    /** Resource type */
    resourceType: string;
    /** Creation timestamp */
    createdAt: Date;
    /** Width if image */
    width?: number;
    /** Height if image */
    height?: number;
    /** Tags associated with the file */
    tags?: string[];
    /** Folder path */
    folder?: string;
    /** Asset ID */
    assetId?: string;
    /** Version ID */
    version?: number;
    /** Signature for the upload */
    signature?: string;
    /** Additional metadata */
    metadata?: Record<string, any>;
}

/**
 * Media deletion result
 */
export interface MediaDeletionResult {
    /** Public ID of the deleted file */
    publicId: string;
    /** Whether the deletion was successful */
    success: boolean;
    /** Result message */
    message?: string;
    /** HTTP status code */
    statusCode?: number;
}

/**
 * Media file details
 */
export interface MediaFileDetails {
    /** Public ID of the file */
    publicId: string;
    /** URL of the file */
    url: string;
    /** Secure URL of the file */
    secureUrl: string;
    /** File format */
    format: string;
    /** File size in bytes */
    bytes: number;
    /** Resource type */
    resourceType: string;
    /** Creation timestamp */
    createdAt: Date;
    /** Width if image */
    width?: number;
    /** Height if image */
    height?: number;
    /** Tags associated with the file */
    tags?: string[];
    /** Folder path */
    folder?: string;
    /** Version ID */
    version?: number;
    /** Access mode */
    accessMode?: string;
    /** Whether the file exists */
    exists: boolean;
}
