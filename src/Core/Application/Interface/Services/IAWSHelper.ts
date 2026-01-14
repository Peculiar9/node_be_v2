import { EmailData } from "@Infrastructure/Services/data/EmailData";
import { SMSData } from "@Infrastructure/Services/data/SMSData";
import { BucketName } from "../../Enums/BucketName";
import { ComparedFace } from "@aws-sdk/client-rekognition";
import { PublishCommandOutput } from "@aws-sdk/client-sns";
import { CompareFacesCommandOutput } from "@aws-sdk/client-rekognition";
import { Express } from 'express';

export interface IAWSHelper {
    sendVerificationEmail(to: string, data: EmailData): Promise<boolean>;
    sendWaitlistEmail(to: string, data: EmailData): Promise<boolean>;
    sendSubscriptionEmail(to: string, data: EmailData): Promise<boolean>;
    sendForgotPasswordEmail(to: string, data: EmailData): Promise<boolean>;
    sendProfileUpdateEmail(to: string, data: EmailData): Promise<boolean>;
    sendOTPEmail(to: string, data: EmailData): Promise<boolean>;
    sendPasswordResetOTPEmail(to: string, data: EmailData): Promise<boolean>;
    sendEmail(to: string, subject: string, body: string): Promise<boolean>;
    sendSMS(data: SMSData, smsType: string): Promise<PublishCommandOutput | void>;
    licenseDetailsUpload(file: any, fileKey: string): Promise<any>;
    carImageUpload(file: any, fileKey: string): Promise<any>;
    profileImageUpload(file: any, fileKey: string): Promise<any>;
    selfieUpload(file: Express.Multer.File, fileKey: string): Promise<any>;
    batchImageUpload(files: any[], fileKey: string[], bucketName: BucketName, directoryPath?: string): Promise<string[]>;
    batchImageDelete(fileKeys: string[], bucketName: BucketName, directoryPath?: string): Promise<string[]>;
    generatePresignedUploadUrl(bucketName: string, key: string, contentType: string, expiresIn?: number): Promise<string>;
    deleteFile(bucketName: string, key: string): Promise<void>;
    detectImageObject(fileKey: string, validLabels: string[]): Promise<boolean>;
    extractDocumentText(fileKey: string): Promise<string[]>;
    extractLicenseDocumentText(fileKey: string): Promise<string[]>;
    analyzeDocuments(documentKeyTarget: string, documentKeySource: string): Promise<[number, ComparedFace]>;
    compareFaces(sourceImage: string, targetImage: string): Promise<CompareFacesCommandOutput | void>;
}