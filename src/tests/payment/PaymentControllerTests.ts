// import 'reflect-metadata';
// import { expect } from 'chai';
// import { Container } from 'inversify';
// import { Request, Response } from 'express';
// import { MockPaymentController } from '../../Controllers/payment/MockPaymentController';
// import { PaymentMethod } from '../../Core/Application/Interface/Services/IPaymentService';
// import { AddPaymentMethodDTO, SetDefaultPaymentMethodDTO } from '../../Core/Application/DTOs/PaymentDTO';

// describe('PaymentController Tests', () => {
//     let mockPaymentController: MockPaymentController;
//     let mockRequest: Partial<Request>;
//     let mockResponse: Partial<Response>;
//     let responseObject: any = {};
//     let statusCode: number = 200;
    
//     beforeEach(() => {
//         // Reset the response object and status code
//         responseObject = {};
//         statusCode = 200;
        
//         // Create a new instance of the mock controller
//         mockPaymentController = new MockPaymentController();
        
//         // Mock request object with authenticated user
//         mockRequest = {
//             user: { _id: 'test-user-id' },
//             body: {},
//             params: {}
//         };
        
//         // Mock response object
//         mockResponse = {
//             status: (code: number) => {
//                 statusCode = code;
//                 return mockResponse as Response;
//             },
//             json: (data: any) => {
//                 responseObject = data;
//                 return mockResponse as Response;
//             }
//         };
//     });
    
//     describe('createSetupIntent', () => {
//         it('should create a setup intent with client secret', async () => {
//             // Act
//             await mockPaymentController.createSetupIntent(mockRequest as Request, mockResponse as Response);
            
//             // Assert
//             expect(responseObject).to.have.property('clientSecret');
//             expect(responseObject.clientSecret).to.be.a('string');
//             expect(responseObject.clientSecret).to.include('seti_mock_test-user-id');
//             expect(statusCode).to.equal(200);
//         });
        
//         it('should handle errors gracefully', async () => {
//             // Arrange
//             mockRequest.user = undefined; // This will cause an error
            
//             // Act
//             await mockPaymentController.createSetupIntent(mockRequest as Request, mockResponse as Response);
            
//             // Assert
//             expect(statusCode).to.equal(500);
//             expect(responseObject).to.have.property('error');
//             expect(responseObject.error).to.include('Failed to create mock setup intent');
//         });
//     });
    
//     describe('addPaymentMethod', () => {
//         it('should add a payment method successfully', async () => {
//             // Arrange
//             mockRequest.body = {
//                 paymentMethodId: 'pm_test_123456789',
//                 setAsDefault: true
//             } as AddPaymentMethodDTO;
            
//             // Act
//             await mockPaymentController.addPaymentMethod(mockRequest as Request, mockResponse as Response);
            
//             // Assert
//             expect(responseObject).to.have.property('id');
//             expect(responseObject.id).to.equal('pm_test_123456789');
//             expect(responseObject.isDefault).to.be.true;
//             expect(responseObject).to.have.property('brand');
//             expect(responseObject).to.have.property('last4');
//             expect(statusCode).to.equal(200);
//         });
        
//         it('should handle missing payment method ID', async () => {
//             // Arrange
//             mockRequest.body = {
//                 setAsDefault: true
//             };
            
//             // Act
//             await mockPaymentController.addPaymentMethod(mockRequest as Request, mockResponse as Response);
            
//             // Assert
//             expect(statusCode).to.equal(500);
//             expect(responseObject).to.have.property('error');
//         });
//     });
    
//     describe('getPaymentMethods', () => {
//         it('should return empty array when no payment methods exist', async () => {
//             // Act
//             await mockPaymentController.getPaymentMethods(mockRequest as Request, mockResponse as Response);
            
//             // Assert
//             expect(Array.isArray(responseObject)).to.be.true;
//             expect(responseObject).to.have.length(0);
//             expect(statusCode).to.equal(200);
//         });
        
//         it('should return payment methods after adding one', async () => {
//             // Arrange - Add a payment method first
//             mockRequest.body = {
//                 paymentMethodId: 'pm_test_123456789',
//                 setAsDefault: true
//             };
//             await mockPaymentController.addPaymentMethod(mockRequest as Request, mockResponse as Response);
            
//             // Act - Get payment methods
//             await mockPaymentController.getPaymentMethods(mockRequest as Request, mockResponse as Response);
            
//             // Assert
//             expect(Array.isArray(responseObject)).to.be.true;
//             expect(responseObject).to.have.length(1);
//             expect(responseObject[0].id).to.equal('pm_test_123456789');
//             expect(statusCode).to.equal(200);
//         });
//     });
    
//     describe('setDefaultPaymentMethod', () => {
//         beforeEach(async () => {
//             // Add two payment methods for testing
//             mockRequest.body = {
//                 paymentMethodId: 'pm_test_123456789',
//                 setAsDefault: true
//             };
//             await mockPaymentController.addPaymentMethod(mockRequest as Request, mockResponse as Response);
            
//             mockRequest.body = {
//                 paymentMethodId: 'pm_test_987654321',
//                 setAsDefault: false
//             };
//             await mockPaymentController.addPaymentMethod(mockRequest as Request, mockResponse as Response);
//         });
        
//         it('should set a payment method as default', async () => {
//             // Arrange
//             mockRequest.body = {
//                 paymentMethodId: 'pm_test_987654321'
//             } as SetDefaultPaymentMethodDTO;
            
//             // Act
//             await mockPaymentController.setDefaultPaymentMethod(mockRequest as Request, mockResponse as Response);
            
//             // Assert
//             expect(responseObject).to.have.property('success');
//             expect(responseObject.success).to.be.true;
//             expect(statusCode).to.equal(200);
            
//             // Verify the payment method is now default
//             await mockPaymentController.getPaymentMethods(mockRequest as Request, mockResponse as Response);
//             const methods = responseObject as PaymentMethod[];
//             const defaultMethod = methods.find(m => m.id === 'pm_test_987654321');
//             expect(defaultMethod?.isDefault).to.be.true;
            
//             // Verify the previous default is no longer default
//             const previousDefault = methods.find(m => m.id === 'pm_test_123456789');
//             expect(previousDefault?.isDefault).to.be.false;
//         });
        
//         it('should handle non-existent payment method ID', async () => {
//             // Arrange
//             mockRequest.body = {
//                 paymentMethodId: 'pm_nonexistent'
//             };
            
//             // Act
//             await mockPaymentController.setDefaultPaymentMethod(mockRequest as Request, mockResponse as Response);
            
//             // Assert
//             expect(statusCode).to.equal(404);
//             expect(responseObject).to.have.property('error');
//             expect(responseObject.error).to.include('Payment method not found');
//         });
//     });
    
//     describe('removePaymentMethod', () => {
//         beforeEach(async () => {
//             // Add a payment method for testing
//             mockRequest.body = {
//                 paymentMethodId: 'pm_test_123456789',
//                 setAsDefault: true
//             };
//             await mockPaymentController.addPaymentMethod(mockRequest as Request, mockResponse as Response);
//         });
        
//         it('should remove a payment method successfully', async () => {
//             // Arrange
//             mockRequest.params = {
//                 paymentMethodId: 'pm_test_123456789'
//             };
            
//             // Act
//             await mockPaymentController.removePaymentMethod(mockRequest as Request, mockResponse as Response);
            
//             // Assert
//             expect(responseObject).to.have.property('success');
//             expect(responseObject.success).to.be.true;
//             expect(statusCode).to.equal(200);
            
//             // Verify the payment method is removed
//             await mockPaymentController.getPaymentMethods(mockRequest as Request, mockResponse as Response);
//             expect(responseObject).to.have.length(0);
//         });
        
//         it('should handle non-existent payment method ID', async () => {
//             // Arrange
//             mockRequest.params = {
//                 paymentMethodId: 'pm_nonexistent'
//             };
            
//             // Act
//             await mockPaymentController.removePaymentMethod(mockRequest as Request, mockResponse as Response);
            
//             // Assert
//             expect(statusCode).to.equal(404);
//             expect(responseObject).to.have.property('error');
//             expect(responseObject.error).to.include('Payment method not found');
//         });
//     });
// });
