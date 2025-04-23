import { SMSData } from ".../../Infrastructure/Services/data/SMSData";

export interface ISMSService {
    sendVerificationSMS(data: SMSData): Promise<any>;
    sendSMS(phoneNumber: string, message: string): Promise<void>;
}
