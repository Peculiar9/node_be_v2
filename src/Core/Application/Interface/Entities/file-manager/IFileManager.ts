
export interface IFileManager {
    _id: string;
    file_key: string;
    upload_purpose: UploadPurpose | string;
    file_type: string;
    user_id: string;
    file_url?: string;
    file_extension?: string;
    updated_at?: Date | string;
    created_at: Date | string;
}

export enum UploadPurpose {
    Verification = 'verification',
    SelfieFacialRecognition = 'selfierecognition',
    LicenseFacialRecognition = 'licenserecognition',
    CarImage = 'carimage',
    UserProfile = 'userprofile',
    PROFILE_IMAGE = 'profile_image'
}