export interface SMSData {
    recipient: string; //phone of user using the E.164 format
    message: string;
    attributes?: any;
}