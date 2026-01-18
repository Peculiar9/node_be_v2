import { Column, ForeignKey, Index } from "peculiar-orm";
import { IFileManager } from "../Interface/Entities/file-manager/IFileManager";
import { CreateFileManagerDTO } from "../DTOs/FileManagerDTO";
import { Console, LogLevel } from "@Infrastructure/Utils/Console";
import { TableNames } from "../Enums/TableNames";

export class FileManager implements IFileManager {
    constructor(data?: Partial<FileManager>) {
        if (data) {
            Object.assign(this, data);
        }
    }

    @Column("UUID PRIMARY KEY DEFAULT gen_random_uuid()")
    _id: string;

    @Column("VARCHAR(255) NOT NULL")
    file_key: string;

    @Column("VARCHAR(255) NOT NULL")
    upload_purpose: string;

    @Column("VARCHAR(255) NOT NULL")
    file_type: string;

    @Index({ unique: false })
    @ForeignKey({ table: TableNames.USERS, field: "_id" })
    @Column("UUID NOT NULL")
    user_id: string;

    @Column("VARCHAR(255)")
    file_url?: string;

    @Column("VARCHAR(50)")
    file_extension?: string;

    @Column("TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
    created_at: Date | string;

    @Column("TEXT")
    fileUrl?: string;

    @Column("TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
    updated_at?: Date | string;

    private static constructS3Url(fileName: string, bucketName: string): string {
        const region = process.env.AWS_REGION || 'us-east-1';
        return `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
    }

    static async createFromDTO(dto: CreateFileManagerDTO): Promise<FileManager> {
        try {
            console.log("Create FileManager DTO: ", { dto });
            // Extract extension from file type if not provided
            const extension = dto.file_extension || dto.file_type.split('/')[1] || 'jpg';

            // Construct file key using the filename and extension
            const fileKey = `${dto.file_name}.${extension}`;

            // Construct the full S3 URL
            const fileUrl = "";

            const fileManagerData: Omit<FileManager, '_id' | 'created_at' | 'updated_at'> = {
                file_key: fileKey,
                upload_purpose: dto.upload_purpose,
                file_type: dto.file_type,
                user_id: dto.user_id,
                file_url: fileUrl,
                file_extension: extension
            };

            const fileManager = new FileManager(fileManagerData);
            console.log("CreateFromDTO FileManager object: ", { fileManager });
            return fileManager;
        } catch (error: any) {
            Console.write('FileManager Object creation error:', LogLevel.ERROR, {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}
