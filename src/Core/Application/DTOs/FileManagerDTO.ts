import { UploadPurpose } from "../Interface/Entities/file-manager/IFileManager";

export interface CreateFileManagerDTO {
    user_id: string;
    file_type: string;
    upload_purpose: UploadPurpose | string;
    file_name: string;
    file_url: string;
    file_extension?: string;
}

export interface FileManagerResponseDTO {
    _id: string;
    file_key: string;
    file_type: string;
    upload_purpose: string;
    user_id: string;
    file_url: string;
    file_extension?: string;
    created_at: Date | string;
    updated_at?: Date | string;
}
