import { TYPES } from "../../Core/Types/Constants";
import { ISMSService } from "../../Core/Application/Interface/Services/ISMSService";
import { SMSData } from "./data/SMSData";
import { inject, injectable } from "inversify";
import { SMSType } from "../../Core/Application/Enums/SMSType";
import { IAWSHelper } from "../../Core/Application/Interface/Services/IAWSHelper";

@injectable()
export class SMSService implements ISMSService {
    constructor(
        @inject(TYPES.AWSHelper) private readonly _awsHelper: IAWSHelper,
    ) {}

    async sendVerificationSMS(data: SMSData): Promise<any> {
        try {
            // const verificationId = user?.verification_id?.toString() || "";
            // const verification = await this._verificationRepository.getVerificationById(verificationId);
            // const isValid = this.confirmValidity(verification?.expiry || 0);
            // if (!verification || !isValid) {
            //   throw new Error(ResponseMessage.INVALID_VERIFICATION);
            // }
            console.log("Gotten to the send SMS verification part: ");
            const smsResult = await this._awsHelper.sendSMS(data, SMSType.SINGLE);
            console.log("SMSService::sendVerficationSMS => ", { smsResult });
            return smsResult;
          } catch (error: any) {
            console.log("SMSServices::sendVerificationSMS() => ", error.message);
          }
    }

    async sendSMS(phoneNumber: string, message: string): Promise<any> {
        try {
            const data = {
                recipient: phoneNumber,
                message: message
            }
            return await this._awsHelper.sendSMS(data, SMSType.SINGLE);
        } catch (error: any) {
            throw new Error(error.message);
        }
    }
}
