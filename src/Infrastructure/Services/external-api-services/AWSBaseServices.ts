import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { EmailData } from "../data/EmailData";
import { SMSData } from "../data/SMSData";
import { SNSClient } from "@aws-sdk/client-sns";
import { Readable } from "stream";
import { SMSType } from "../../../Core/Application/Enums/SMSType";
import { EmailType } from "../../../Core/Application/Enums/EmailType";
import { BucketName } from "../../../Core/Application/Enums/BucketName";
import { APP_NAME } from "../../../Core/Types/Constants";
// import { RekognitionClient, DetectTextCommand } from "@aws-sdk/client-rekognition";
import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { injectable } from "inversify";
import { ValidationError } from "../../../Core/Application/Error/AppError";
import { UtilityService } from "../../../Core/Services/UtilityService";
import { FileService } from "../FileService";
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { EnvironmentConfig } from '../../Config/EnvironmentConfig';


@injectable()
export class AWSBaseServices {
    protected fileService: FileService;
    protected s3Client: S3Client;
    protected s3KYCClient: S3Client;
    protected snsClient: SNSClient;
    protected rekognitionClient: RekognitionClient;
    protected sesClient: SESClient;

    constructor() {
        const region = EnvironmentConfig.get('AWS_REGION', 'us-east-1');
        const credentials = {
            accessKeyId: EnvironmentConfig.get('AWS_ACCESS_KEY_ID_EMAIL'), //TODO: Change to AWS_ACCESS_KEY_ID_KYC if it does not work with S3Client
            secretAccessKey: EnvironmentConfig.get('AWS_SECRET_ACCESS_KEY_EMAIL')
        };

        this.s3Client = new S3Client({ 
            region,
            credentials
        });

        this.s3KYCClient = new S3Client({
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID_KYC!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_KYC!,
            },
            region: process.env.AWS_REGION
        })
        this.snsClient = new SNSClient({
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID_KYC!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_KYC!,
            },
            region: process.env.AWS_REGION
        });

        this.rekognitionClient = new RekognitionClient({
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID_KYC!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_KYC!,
            },
            region: process.env.AWS_REGION
          });

        this.sesClient = new SESClient({
            region,
            credentials
        });
    }

    private logOperation(operation: string, details: any) {
        console.log(`[AWS Operation] ${operation}:`, JSON.stringify({
            timestamp: new Date().toISOString(),
            ...details
        }, null, 2));
    }

    protected replaceVariables(template: string, variables: { [key: string]: string }): string {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            result = result.replace(new RegExp(placeholder, 'g'), value);
        }
        return result;
    }

    //parse email template
    protected async parseEmailTemplate(stream: Readable): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let data = '';
            stream.on('data', (chunk) => {
                data += chunk;
            });
            stream.on('end', () => {
                // console.log('AWSHelper::parseEmailTemplate response => ', data);
                resolve(data);
            });
            stream.on('error', (error) => {
                console.log('AWSHelper::parseEmailTemplate error => ', error.message);
                reject(error);
            });
        });
    }

    //universal get file from S3 Bucket. 
    protected async getFile(bucketName: string, fileKey: string): Promise<{ Body: Readable | null | undefined, ContentType: string | undefined }> {
        try {
            const command = new GetObjectCommand({ Bucket: bucketName, Key: fileKey });
            const response = await this.s3Client.send(command);
            return {
                Body: response.Body as Readable,
                ContentType: response.ContentType
            };
        } catch (error: any) {
            console.log('AWSHelper::getFile() => error => ', error.message);
            throw error;
        }
    }

    protected async getEmailTemplate(emailType: string, data: EmailData): Promise<string> {
        this.logOperation('Email Template Fetch Started', {
            emailType,
            bucket: BucketName.EMAIL_TEMPLATE_S3_BUCKET
        });

        try {
            const bucketName = BucketName.EMAIL_TEMPLATE_S3_BUCKET;
            const templateMap: Record<string, string> = {
                [EmailType.VERIFICATION]: `${emailType}-email.html`,
                [EmailType.SUBSCRIPTION]: `${emailType}-email.html`,
                [EmailType.FORGOT_PASSWORD]: `${emailType}-email.html`,
                [EmailType.PROFILE_UPDATE]: `${emailType}-email.html`
            };

            const key = templateMap[emailType];
            if (!key) {
                throw new Error(`Invalid email type: ${emailType}`);
            }

            const template = await this.getEmailFile(bucketName, key, data);
            
            this.logOperation('Email Template Fetch Completed', {
                emailType,
                templateKey: key,
                templateLength: template.length
            });

            return template;
        } catch (error: any) {
            this.logOperation('Email Template Fetch Failed', {
                emailType,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    protected getEmailHeaderData(emailType: string) {
        if (emailType === EmailType.VERIFICATION) {
            return EmailHeaderData.VERIFICATION;
        }
        if (emailType === EmailType.WELCOME) {
            return EmailHeaderData.WELCOME;
        }
        if (emailType === EmailType.SUBSCRIPTION) {
            return EmailHeaderData.SUBSCRIPTION;
        }
        if (emailType === EmailType.FORGOT_PASSWORD) {

        }
        //TODO: For Order confirmation and password reset e.t.c
    }


    protected async getEmailFile(bucketName: string, key: string, data: EmailData): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: key
            });

            const response = await this.s3Client.send(command);
            
            // Convert stream to string
            const streamToString = (stream: NodeJS.ReadableStream): Promise<string> =>
                new Promise((resolve, reject) => {
                    const chunks: any[] = [];
                    stream.on('data', (chunk) => chunks.push(chunk));
                    stream.on('error', reject);
                    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
                });

            let template = '';
            if (response.Body) {
                template = await streamToString(response.Body as NodeJS.ReadableStream);
            }

            // Replace placeholders with actual data
            Object.entries(data).forEach(([key, value]) => {
                template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
            });

            return template;
        } catch (error: any) {
            console.error('Error getting email template:', error);
            throw new Error(`Failed to get email template: ${error.message}`);
        }
    }
    protected async uploadFile({
        bucketName,
        directoryPath,
        fileName,
        fileBody,
        contentType,
    }: FileUploadOptions): Promise<void> {
        try {
            this.logOperation('S3 Upload Started', {
                bucket: bucketName,
                fileName,
                contentType
            });

            const fileKey = fileName;
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: fileKey,
                Body: fileBody,
                ContentType: contentType,
            });

            const response = await this.s3KYCClient.send(command);
            const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
            
            this.logOperation('S3 Upload Completed', {
                bucket: bucketName,
                fileName,
                fileUrl,
                response: {
                    requestId: response.$metadata.requestId,
                    httpStatusCode: response.$metadata.httpStatusCode
                }
            });
        } catch (error: any) {
            this.logOperation('S3 Upload Failed', {
                bucket: bucketName,
                fileName,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    };

    protected async removeFile({
        bucketName,
        fileName,
      }: FileRemovalOptions): Promise<void> {
        try {
          const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: fileName,
          });
    
          const response = await this.s3KYCClient.send(command);
          console.log("File removed successfully:", response);
        } catch (error: any) {
          console.error("AWSHelper::removeFile() => error => ", error.message);
          throw error;
        }
      }

    protected getSMSParams(data: SMSData, smsType: string) {
        if (smsType === SMSType.BULK) {
            const params = {
                Message: data?.message,
                Subject: data?.attributes?.subject,
                TopicArn: data?.attributes?.topicArn
            }
            return params;
        }
        else {
            const params = {
                Message: data?.message,
                PhoneNumber: data?.recipient,
                MessageAttributes: {
                    'SNS.SMS.SMdata?.SType': {
                        DataType: data?.attributes?.datatype ?? 'string',
                        StringValue: data?.attributes?.value ?? 'Transactional',
                    }
                }
            };
            return params;
        }
    }


    //HELPER METHODS
    protected emailValidation(recipient: string) {
        const isValidEmail = UtilityService.isValidEmail(recipient.trim())
        if (!isValidEmail) {
            throw new ValidationError('Invalid email, please check and try again!!!');
        }
    }

    async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
        this.logOperation('Email Send Started', {
            to,
            subject,
            environment: process.env.NODE_ENV
        });

        const params = {
            Destination: { ToAddresses: [to] },
            Message: {
                Body: { Html: { Charset: 'UTF-8', Data: body } },
                Subject: { Charset: 'UTF-8', Data: subject }
            },
            Source: EnvironmentConfig.get('AWS_SES_FROM_EMAIL')
        };

        try {
            const command = new SendEmailCommand(params);
            const result = await this.sesClient.send(command);
            
            this.logOperation('Email Send Completed', {
                to,
                subject,
                messageId: result.MessageId,
                requestId: result.$metadata.requestId
            });
            return true;
        } catch (error: any) {
            this.logOperation('Email Send Failed', {
                to,
                subject,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    async uploadToS3(
        bucketName: string,
        key: string,
        body: Buffer,
        contentType: string
    ): Promise<string> {
        try {
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: body,
                ContentType: contentType
            });

            await this.s3Client.send(command);
            return `https://${bucketName}.s3.amazonaws.com/${key}`;
        } catch (error: any) {
            console.error('Error uploading to S3:', error);
            throw new Error(`Failed to upload to S3: ${error.message}`);
        }
    }
}

export interface FileUploadOptions {
    bucketName: string;
    directoryPath: string;
    fileName: string;
    fileBody: Readable | Buffer | string;
    contentType?: string;
}

export interface FileRemovalOptions {
    bucketName: string;
    fileName: string;
}

export interface BaseAWSSDKResponse {
        httpStatusCode: number;
        requestId: string;
        extendedRequestId?: string;
        cfId?: string;
        attempts: number;
        totalRetryDelay: number;  
}

export interface DetectTextResponse {
    $metadata: BaseAWSSDKResponse;
    TextDetections: unknown[]; // Replace with the actual type of TextDetections which is string but let us test for now.
    TextModelVersion: string;
}

export interface S3UploadResponse {
    $metadata: BaseAWSSDKResponse;
     MessageId: string;
}




export enum EmailHeaderData {
    WELCOME = `Welcome to ${APP_NAME}`,
    WAITLIST = `Welcome to ${APP_NAME}`,
    SUBSCRIPTION = `Welcome to ${APP_NAME}`,
    OTP = ` Verify It's You: OTP `,
    VERIFICATION = ` Verify It's You `,
    PASSWORD_RESET = `Unlock Your Account: Reset Password Inside`,
    ORDER_CONFIRMATION = `Your Order, Confirmed: Details Enclosed`
}