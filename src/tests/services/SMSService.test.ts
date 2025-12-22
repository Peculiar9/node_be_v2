// import 'reflect-metadata';
// import { Container } from 'inversify';
// import { TYPES } from '../../Core/Types/Constants';
// import { SMSService } from '../../Infrastructure/Services/SMSService';
// import { ISMSService } from '../../Core/Application/Interface/Services/ISMSService';
// import { IAWSHelper } from '../../Core/Application/Interface/Services/IAWSHelper';
// import { ITwilioService } from '../../Core/Application/Interface/Services/ITwilioService';
// import { SMSData } from '../../Infrastructure/Services/data/SMSData';
// import { SMSType } from '../../Core/Application/Enums/SMSType';

// describe('SMSService', () => {
//   let container: Container;
//   let smsService: ISMSService;
//   let mockTwilioService: ITwilioService;
//   let mockAWSHelper: IAWSHelper;

//   beforeEach(() => {
//     container = new Container();
    
//     // Create mock services
//     mockTwilioService = {
//       sendSMS: jest.fn().mockResolvedValue({
//         sid: 'mock-message-sid',
//         status: 'sent',
//         dateCreated: new Date(),
//         dateUpdated: new Date(),
//         to: '+1234567890',
//         from: '+0987654321',
//         body: 'Test message',
//         success: true
//       }),
//       sendWhatsApp: jest.fn(),
//       startVerification: jest.fn().mockResolvedValue({
//         sid: 'mock-verification-sid',
//         status: 'pending',
//         to: '+1234567890',
//         valid: true,
//         channel: 'sms'
//       }),
//       checkVerification: jest.fn().mockResolvedValue({
//         sid: 'mock-verification-check-sid',
//         status: 'approved',
//         valid: true
//       })
//     };
    
//     mockAWSHelper = {
//       sendSMS: jest.fn().mockResolvedValue({
//         success: true,
//         message: 'SMS sent via AWS SNS'
//       }),
//       uploadFile: jest.fn(),
//       getSignedUrl: jest.fn(),
//       deleteFile: jest.fn()
//     };
    
//     // Register mocks in the container
//     container.bind<ITwilioService>(TYPES.TwilioService).toConstantValue(mockTwilioService);
//     container.bind<IAWSHelper>(TYPES.AWSHelper).toConstantValue(mockAWSHelper);
    
//     // Register the service
//     container.bind<ISMSService>(TYPES.SMSService).to(SMSService);
    
//     // Get the service instance
//     smsService = container.get<ISMSService>(TYPES.SMSService);
//   });

//   describe('sendOTPSMS', () => {
//     it('should send OTP SMS successfully', async () => {
//       // Arrange
//       const smsData: SMSData = {
//         recipient: '+1234567890',
//         message: ''
//       };
      
//       // Act
//       const result = await smsService.sendOTPSMS(smsData);
      
//       // Assert
//       expect(result).toBeDefined();
//       expect(result.success).toBe(true);
//       expect(result.status).toBe('pending');
//       expect(result.sid).toBe('mock-verification-sid');
//       expect(result.to).toBe('+1234567890');
//       expect(result.channel).toBe('sms');
//       expect(mockTwilioService.startVerification).toHaveBeenCalledWith(
//         '+1234567890',
//         { channel: 'sms' }
//       );
//     });

//     it('should throw error when recipient is missing', async () => {
//       // Arrange
//       const smsData: SMSData = {
//         recipient: '',
//         message: ''
//       };
      
//       // Act & Assert
//       await expect(smsService.sendOTPSMS(smsData)).rejects.toThrow('Phone number is required');
//     });

//     it('should handle Twilio errors', async () => {
//       // Arrange
//       const smsData: SMSData = {
//         recipient: '+1234567890',
//         message: ''
//       };
      
//       // Mock Twilio service to throw an error
//       (mockTwilioService.startVerification as jest.Mock).mockRejectedValueOnce(
//         new Error('Failed to start verification')
//       );
      
//       // Act & Assert
//       await expect(smsService.sendOTPSMS(smsData)).rejects.toThrow('Failed to send OTP SMS: Failed to start verification');
//     });
//   });

//   describe('verifyOTP', () => {
//     it('should verify OTP code successfully', async () => {
//       // Arrange
//       const smsData: SMSData = {
//         recipient: '+1234567890',
//         message: '123456'
//       };
      
//       // Act
//       const result = await smsService.verifyOTP(smsData);
      
//       // Assert
//       expect(result).toBeDefined();
//       expect(result.valid).toBe(true);
//       expect(result.status).toBe('approved');
//       expect(result.message).toBe('OTP verification successful');
//       expect(mockTwilioService.checkVerification).toHaveBeenCalledWith(
//         '+1234567890',
//         '123456'
//       );
//     });

//     it('should throw error when recipient or code is missing', async () => {
//       // Arrange
//       const smsData: SMSData = {
//         recipient: '+1234567890',
//         message: ''
//       };
      
//       // Act & Assert
//       await expect(smsService.verifyOTP(smsData)).rejects.toThrow('Phone number and verification code are required');
//     });

//     it('should handle Twilio errors', async () => {
//       // Arrange
//       const smsData: SMSData = {
//         recipient: '+1234567890',
//         message: '123456'
//       };
      
//       // Mock Twilio service to throw an error
//       (mockTwilioService.checkVerification as jest.Mock).mockRejectedValueOnce(
//         new Error('Failed to check verification')
//       );
      
//       // Act & Assert
//       await expect(smsService.verifyOTP(smsData)).rejects.toThrow('Failed to verify OTP: Failed to check verification');
//     });
//   });

//   describe('sendSMS', () => {
//     it('should send SMS using Twilio successfully', async () => {
//       // Arrange
//       const phoneNumber = '+1234567890';
//       const message = 'Test message';
      
//       // Act
//       const result = await smsService.sendSMS(phoneNumber, message);
      
//       // Assert
//       expect(result).toBeDefined();
//       expect(result.success).toBe(true);
//       expect(result.status).toBe('sent');
//       expect(result.sid).toBe('mock-message-sid');
//       expect(mockTwilioService.sendSMS).toHaveBeenCalledWith(phoneNumber, message);
//       expect(mockAWSHelper.sendSMS).not.toHaveBeenCalled();
//     });

//     it('should fall back to AWS SNS when Twilio fails', async () => {
//       // Arrange
//       const phoneNumber = '+1234567890';
//       const message = 'Test message';
      
//       // Mock Twilio service to return failure
//       (mockTwilioService.sendSMS as jest.Mock).mockResolvedValueOnce({
//         success: false,
//         errorMessage: 'Twilio error'
//       });
      
//       // Act
//       const result = await smsService.sendSMS(phoneNumber, message);
      
//       // Assert
//       expect(result).toBeDefined();
//       expect(result.success).toBe(true);
//       expect(result.message).toBe('SMS sent via AWS SNS');
//       expect(mockTwilioService.sendSMS).toHaveBeenCalledWith(phoneNumber, message);
//       expect(mockAWSHelper.sendSMS).toHaveBeenCalledWith(
//         { recipient: phoneNumber, message },
//         SMSType.SINGLE
//       );
//     });
//   });
// });
