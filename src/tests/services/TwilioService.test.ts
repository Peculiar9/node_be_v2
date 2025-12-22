// import 'reflect-metadata';
// import { Container } from 'inversify';
// import { TYPES } from '../../Core/Types/Constants';
// import { TwilioService } from '../../Infrastructure/Services/TwilioService';
// import { ITwilioService, TwilioVerificationOptions } from '../../Core/Application/Interface/Services/ITwilioService';

// // Mock Twilio client
// jest.mock('twilio', () => {
//   // Mock message creation
//   const mockMessages = {
//     create: jest.fn().mockResolvedValue({
//       sid: 'mock-message-sid',
//       status: 'sent',
//       dateCreated: new Date(),
//       dateUpdated: new Date(),
//       to: '+1234567890',
//       from: '+0987654321',
//       body: 'Test message'
//     })
//   };

//   // Mock verification creation
//   const mockVerifications = {
//     create: jest.fn().mockResolvedValue({
//       sid: 'mock-verification-sid',
//       status: 'pending',
//       to: '+1234567890',
//       channel: 'sms',
//       valid: true
//     })
//   };

//   // Mock verification check
//   const mockVerificationChecks = {
//     create: jest.fn().mockResolvedValue({
//       sid: 'mock-verification-check-sid',
//       status: 'approved',
//       valid: true
//     })
//   };

//   // Mock verify service
//   const mockVerifyService = {
//     verifications: mockVerifications,
//     verificationChecks: mockVerificationChecks
//   };

//   // Mock verify client
//   const mockVerify = {
//     v2: {
//       services: jest.fn().mockReturnValue(mockVerifyService)
//     }
//   };

//   // Return mock Twilio client constructor
//   return jest.fn().mockImplementation(() => {
//     return {
//       messages: mockMessages,
//       verify: mockVerify
//     };
//   });
// });

// describe('TwilioService', () => {
//   let container: Container;
//   let twilioService: ITwilioService;

//   beforeEach(() => {
//     container = new Container();
    
//     // Register mock dependencies
//     container.bind<string>(TYPES.TWILIO_ACCOUNT_SID).toConstantValue('mock-account-sid');
//     container.bind<string>(TYPES.TWILIO_AUTH_TOKEN).toConstantValue('mock-auth-token');
//     container.bind<string>(TYPES.TWILIO_VERIFY_SERVICE_SID).toConstantValue('mock-verify-service-sid');
//     container.bind<string>(TYPES.TWILIO_PHONE_NUMBER).toConstantValue('+0987654321');
//     container.bind<string>(TYPES.TWILIO_WHATSAPP_NUMBER).toConstantValue('+0987654321');
    
//     // Register the service
//     container.bind<ITwilioService>(TYPES.TwilioService).to(TwilioService);
    
//     // Get the service instance
//     twilioService = container.get<ITwilioService>(TYPES.TwilioService);
//   });

//   describe('sendSMS', () => {
//     it('should send an SMS message successfully', async () => {
//       // Arrange
//       const to = '+1234567890';
//       const body = 'Test message';
      
//       // Act
//       const result = await twilioService.sendSMS(to, body);
      
//       // Assert
//       expect(result).toBeDefined();
//       expect(result.success).toBe(true);
//       expect(result.sid).toBe('mock-message-sid');
//       expect(result.status).toBe('sent');
//       expect(result.to).toBe('+1234567890');
//       expect(result.body).toBe('Test message');
//     });

//     it('should handle errors when sending SMS', async () => {
//       // Arrange
//       const to = '+1234567890';
//       const body = 'Test message';
      
//       // Mock the Twilio client to throw an error
//       const twilioModule = require('twilio');
//       const mockTwilioClient = twilioModule.mockImplementation(() => {
//         return {
//           messages: {
//             create: jest.fn().mockRejectedValue(new Error('Failed to send SMS'))
//           }
//         };
//       });
      
//       // Act
//       const result = await twilioService.sendSMS(to, body);
      
//       // Assert
//       expect(result).toBeDefined();
//       expect(result.success).toBe(false);
//       expect(result.errorMessage).toBe('Failed to send SMS');
      
//       // Restore the mock
//       mockTwilioClient.mockRestore();
//     });
//   });

//   describe('sendWhatsApp', () => {
//     it('should send a WhatsApp message successfully', async () => {
//       // Arrange
//       const to = '+1234567890';
//       const body = 'Test WhatsApp message';
      
//       // Act
//       const result = await twilioService.sendWhatsApp(to, body);
      
//       // Assert
//       expect(result).toBeDefined();
//       expect(result.success).toBe(true);
//       expect(result.sid).toBe('mock-message-sid');
//       expect(result.status).toBe('sent');
//     });
//   });

//   describe('startVerification', () => {
//     it('should start verification process successfully', async () => {
//       // Arrange
//       const to = '+1234567890';
//       const options: TwilioVerificationOptions = {
//         channel: 'sms'
//       };
      
//       // Act
//       const result = await twilioService.startVerification(to, options);
      
//       // Assert
//       expect(result).toBeDefined();
//       expect(result.sid).toBe('mock-verification-sid');
//       expect(result.status).toBe('pending');
//       expect(result.to).toBe('+1234567890');
//       expect(result.channel).toBe('sms');
//       expect(result.valid).toBe(true);
//     });
//   });

//   describe('checkVerification', () => {
//     it('should check verification code successfully', async () => {
//       // Arrange
//       const to = '+1234567890';
//       const code = '123456';
      
//       // Act
//       const result = await twilioService.checkVerification(to, code);
      
//       // Assert
//       expect(result).toBeDefined();
//       expect(result.sid).toBe('mock-verification-check-sid');
//       expect(result.status).toBe('approved');
//       expect(result.valid).toBe(true);
//     });
//   });
// });
