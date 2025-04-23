import { injectable } from "inversify";
import { EmailData } from "../data/EmailData";
import { EmailType } from "../../../Core/Application/Enums/EmailType";
import { SMSData } from "../data/SMSData";
import { BucketName } from "../../../Core/Application/Enums/BucketName";
import { AWSBaseServices } from "./AWSBaseServices";
import { PublishCommand } from "@aws-sdk/client-sns";
import { IAWSHelper } from "../../../Core/Application/Interface/Services/IAWSHelper";
import { ComparedFace, CompareFacesCommandOutput } from "@aws-sdk/client-rekognition";
import { FileFormat } from "../../../Core/Application/Enums/FileFormat";

@injectable()
export class AWSHelper extends AWSBaseServices implements IAWSHelper {
    constructor() {
        super();
    }
 
    async sendVerificationEmail(to: string, data: EmailData): Promise<boolean> {
        const template = await this.getEmailTemplate(EmailType.VERIFICATION, data);
        return await this.sendEmail(
            to,
            'Verify Your Email Address',
            template
        );
    }

    async sendWaitlistEmail(to: string, data: EmailData): Promise<boolean> {
        const template = await this.getEmailTemplate(EmailType.WAITLIST, data);
        return await this.sendEmail(
            to,
            'Welcome to Our Waitlist',
            template
        );
    }

    async sendSubscriptionEmail(to: string, data: EmailData): Promise<boolean> {
        const template = await this.getEmailTemplate(EmailType.SUBSCRIPTION, data);
        return await this.sendEmail(
            to,
            'Subscription Confirmation',
            template
        );
    }

    async sendForgotPasswordEmail(to: string, data: EmailData): Promise<boolean> {
        const template = await this.getEmailTemplate(EmailType.FORGOT_PASSWORD, data);
        return await this.sendEmail(
            to,
            'Password Reset Request',
            template
        );
    }

    async sendProfileUpdateEmail(to: string, data: EmailData): Promise<boolean> {
        const template = await this.getEmailTemplate(EmailType.PROFILE_UPDATE, data);
        return await this.sendEmail(
            to,
            'Profile Update Verification',
            template
        );
    }

    async sendSMS(data: SMSData, smsType: string): Promise<any> {
        try {
            // Sanitize message and attributes
            const sanitizedMessage = this.sanitizeMessage(data.message);
            const sanitizedPhone = this.sanitizePhoneNumber(data.recipient);

            const params = {
                Message: sanitizedMessage,
                PhoneNumber: sanitizedPhone,
                MessageAttributes: {
                    'AWS.SNS.SMS.SMSType': {
                        DataType: 'String',
                        StringValue: smsType === 'SINGLE' ? 'Transactional' : 'Promotional'
                    },
                    'AWS.SNS.SMS.SenderID': {
                        DataType: 'String',
                        StringValue: process.env.AWS_SNS_SENDER_ID || 'GRWLZ'
                    }
                }
            };

            return await this.snsClient.send(new PublishCommand(params));
        } catch (error: any) {
            console.error('AWSHelper::sendSMS() => error => ', error.message);
            throw new Error(`Failed to send SMS: ${error.message}`);
        }
    }

    private sanitizeMessage(message: string): string {
        // Remove or replace problematic characters
        return message
            .replace(/[^\w\s.,!?@#$%&*()-]/g, '') // Keep only alphanumeric and common punctuation
            .trim();
    }

    private sanitizePhoneNumber(phone: string): string {
        // Ensure phone number is in E.164 format
        return phone.replace(/[^\d+]/g, '');
    }

    async licenseDetailsUpload(file: any, fileKey: string): Promise<any> {
        const uploadData = {
            bucketName: BucketName.VERIFICATION,
            directoryPath: `license/`,
            fileName: fileKey,
            fileBody: file,
        };
        await this.uploadFile(uploadData);
    }

    async carImageUpload(file: any, fileKey: string): Promise<any> {
        const uploadData = {
            bucketName: BucketName.VERIFICATION,
            directoryPath: `carImage/`,
            fileName: fileKey,
            fileBody: file.buffer,
            contentType: file.type,
        };
        return await this.uploadFile(uploadData);
    }

    async profileImageUpload(file: any, fileKey: string): Promise<any> {
        const uploadData = {
            bucketName: BucketName.VERIFICATION,
            directoryPath: `profileImage/`,
            fileName: fileKey,
            fileBody: file.buffer,
            contentType: file.type,
        };
        return await this.uploadFile(uploadData);
    }

    async batchImageUpload(
        files: any[], 
        fileKey: string[], 
        bucketName: BucketName, 
        directoryPath: string = ''
    ): Promise<string[]> {
        const urls: string[] = [];
        await Promise.all(files.map(async (file: any, index: number) => {
            const uploadData = {
                bucketName,
                directoryPath: `${directoryPath}/`,
                fileName: fileKey[index],
                fileBody: file,
                contentType: FileFormat.JPEG,
            };

            await this.uploadFile(uploadData);
            const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey[index]}`;
            urls.push(fileUrl);
        }));

        return urls;
    }

    async batchImageDelete(
        fileKeys: string[], 
        bucketName: BucketName, 
        directoryPath: string = ''
    ): Promise<string[]> {
        const deletedKeys: string[] = [];
        
        await Promise.all(fileKeys.map(async (fileKey: string) => {
            const fullPath = `${directoryPath}/${fileKey}`.replace(/^\/+/, '');
            try {
                await this.removeFile({
                    bucketName,
                    fileName: fullPath,
                });
                deletedKeys.push(fullPath);
            } catch (error) {
                console.error(`Failed to delete ${fullPath}:`, error);
            }
        }));

        return deletedKeys;
    }

    selfieUpload(file: Express.Multer.File, fileKey: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    detectImageObject(file: Buffer, validLabels: string[]): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    extractDocumentText(fileKey: string): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    extractLicenseDocumentText(fileKey: string): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    analyzeDocuments(documentKeyTarget: string, documentKeySource: string): Promise<[number, ComparedFace]> {
        throw new Error("Method not implemented.");
    }
    compareFaces(sourceImage: string, targetImage: string): Promise<CompareFacesCommandOutput | void> {
        throw new Error("Method not implemented.");
    }
}