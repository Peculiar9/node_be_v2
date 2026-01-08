import { TYPES } from "../../Core/Types/Constants";
import { ISMSService } from "../../Core/Application/Interface/Services/ISMSService";
import { SMSData } from "./data/SMSData";
import { inject, injectable } from "inversify";
import { SMSType } from "../../Core/Application/Enums/SMSType";
import { IAWSHelper } from "../../Core/Application/Interface/Services/IAWSHelper";
import { ITwilioService, TwilioVerificationOptions } from "../../Core/Application/Interface/Services/ITwilioService";

@injectable()
export class SMSService implements ISMSService {
    constructor(
        @inject(TYPES.AWSHelper) private readonly _awsHelper: IAWSHelper,
        // @inject(TYPES.TwilioService) private readonly _twilioService: ITwilioService,
    ) {}
    
    /**
     * Verify OTP code sent to a phone number
     * @param data SMS data containing recipient phone number and verification code
     * @returns Verification result
     */
    async verifyOTP(data: SMSData): Promise<any> {
        // try {
        //     console.log("SMSService::verifyOTP => Verifying OTP code", { recipient: data.recipient });
            
        //     if (!data.recipient || !data.message) {
        //         throw new Error("Phone number and verification code are required");
        //     }
            
        //     // The message field contains the verification code
        //     const verificationResult = await this._twilioService.checkVerification(
        //         data.recipient,
        //         data.message
        //     );
            
        //     console.log("SMSService::verifyOTP => Verification result", verificationResult);
            
        //     return {
        //         valid: verificationResult.valid,
        //         status: verificationResult.status,
        //         message: verificationResult.valid 
        //             ? "OTP verification successful" 
        //             : "Invalid or expired verification code"
        //     };
        // } catch (error: any) {
        //     console.error("SMSService::verifyOTP => Error verifying OTP", error);
        //     throw new Error(`Failed to verify OTP: ${error.message}`);
        // }
        throw new Error("Not implemented");
    }
    
    /**
     * Send OTP SMS to a phone number
     * @param data SMS data containing recipient phone number
     * @returns Verification initiation result
     */
    async sendOTPSMS(data: SMSData): Promise<any> {
        // try {
            // console.log("SMSService::sendOTPSMS => Sending OTP SMS", { recipient: data.recipient });
            
            // if (!data.recipient) {
            //     throw new Error("Phone number is required");
            // }
            
            // // Configure verification options
            // const verificationOptions: TwilioVerificationOptions = {
            //     channel: 'sms'
            // };
            
            // // Start verification process which sends OTP via SMS
            // const verificationResult = await this._twilioService.startVerification(
            //     data.recipient,
            //     verificationOptions
            // );
            
            // console.log("SMSService::sendOTPSMS => OTP SMS sent", { 
            //     recipient: data.recipient,
            //     status: verificationResult.status
            // });
            
            // return {
            //     success: verificationResult.valid,
            //     status: verificationResult.status,
            //     sid: verificationResult.sid,
            //     to: verificationResult.to,
            //     channel: verificationResult.channel,
            //     message: "OTP SMS sent successfully"
            // };
        // } catch (error: any) {
        //     console.error("SMSService::sendOTPSMS => Error sending OTP SMS", error);
        //     throw new Error(`Failed to send OTP SMS: ${error.message}`);
        // }
        throw new Error("Method not implemented!!!");
    }

    async sendVerificationSMS(data: SMSData): Promise<any> {
        try {
            console.log("Gotten to the send SMS verification part: ");
            const smsResult = await this._awsHelper.sendSMS(data, SMSType.SINGLE);
            console.log("SMSService::sendVerficationSMS => ", { smsResult });
            return smsResult;
          } catch (error: any) {
            console.log("SMSServices::sendVerificationSMS() => ", error.message);
          }
    }

    async sendSMS(phoneNumber: string, message: string): Promise<any> {
        // try {
        //     // Try to send SMS using Twilio first
        //     const twilioResult = await this._twilioService.sendSMS(phoneNumber, message);
            
        //     // If Twilio succeeds, return the result
        //     if (twilioResult.success) {
        //         return twilioResult;
        //     }
            
        //     // If Twilio fails, fall back to AWS SNS
        //     console.log("Twilio SMS failed, falling back to AWS SNS");
        //     const data = {
        //         recipient: phoneNumber,
        //         message: message
        //     }
        //     return await this._awsHelper.sendSMS(data, SMSType.SINGLE);
        // } catch (error: any) {
        //     throw new Error(error.message);
        // }
        throw new Error("Method not implemented!!!");
    }
}
