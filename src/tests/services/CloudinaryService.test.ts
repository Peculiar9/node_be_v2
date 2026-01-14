// import { Container } from 'inversify';
// import { CloudinaryService } from '@Infrastructure/Services/media/CloudinaryService';
// import { TYPES } from '@Core/Types/Constants';
// import { TestUtils } from '../utils/TestUtils';
// import { TransactionManager } from '@Infrastructure/Repository/SQL/Abstractions/TransactionManager';
// import { IMediaService } from '@Core/Application/Interface/Services/IMediaService';
// import * as fs from 'fs';
// import * as path from 'path';

// jest.mock('cloudinary', () => {
//   return {
//     v2: {
//       config: jest.fn(),
//       uploader: {
//         upload: jest.fn().mockResolvedValue({
//           public_id: 'test-public-id',
//           secure_url: 'https://res.cloudinary.com/test/image/upload/test-public-id',
//           bytes: 1024,
//           format: 'jpg',
//           resource_type: 'image'
//         }),
//         destroy: jest.fn().mockResolvedValue({ result: 'ok' })
//       },
//       api: {
//         resource: jest.fn().mockResolvedValue({
//           public_id: 'test-public-id',
//           secure_url: 'https://res.cloudinary.com/test/image/upload/test-public-id',
//           bytes: 1024,
//           format: 'jpg',
//           resource_type: 'image'
//         })
//       },
//       url: jest.fn().mockReturnValue('https://res.cloudinary.com/test/image/upload/test-public-id')
//     }
//   };
// });

// describe('CloudinaryService', () => {
//   let container: Container;
//   let cloudinaryService: IMediaService;
//   let mockTransactionManager: jest.Mocked<TransactionManager>;

//   beforeEach(() => {
//     container = TestUtils.createMockContainer();
    
//     mockTransactionManager = TestUtils.createSpyObj('TransactionManager', [
//       'beginTransaction',
//       'commit',
//       'rollback'
//     ]);

//     // Bind the necessary dependencies
//     container.bind<TransactionManager>(TYPES.TransactionManager).toConstantValue(mockTransactionManager);
//     container.bind<string>(TYPES.CLOUDINARY_CLOUD_NAME).toConstantValue('test-cloud-name');
//     container.bind<string>(TYPES.CLOUDINARY_API_KEY).toConstantValue('test-api-key');
//     container.bind<string>(TYPES.CLOUDINARY_API_SECRET).toConstantValue('test-api-secret');
//     container.bind<IMediaService>(TYPES.MediaService).to(CloudinaryService);

//     cloudinaryService = container.get<IMediaService>(TYPES.MediaService);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('uploadFile', () => {
//     it('should upload a file from a buffer successfully', async () => {
//       // Create a test buffer
//       const buffer = Buffer.from('test image data');
      
//       const result = await cloudinaryService.uploadFile(buffer, {
//         folder: 'test-folder',
//         publicId: 'test-image'
//       });

//       expect(result).toBeDefined();
//       expect(result.publicId).toBe('test-public-id');
//       expect(result.url).toBe('https://res.cloudinary.com/test/image/upload/test-public-id');
//       expect(mockTransactionManager.beginTransaction).toHaveBeenCalled();
//       expect(mockTransactionManager.commit).toHaveBeenCalled();
//     });

//     it('should handle errors during upload', async () => {
//       // Mock the cloudinary uploader to throw an error
//       const cloudinary = require('cloudinary');
//       cloudinary.v2.uploader.upload.mockRejectedValueOnce(new Error('Upload failed'));

//       const buffer = Buffer.from('test image data');
      
//       await expect(cloudinaryService.uploadFile(buffer, {
//         folder: 'test-folder'
//       })).rejects.toThrow('Failed to upload file');
      
//       expect(mockTransactionManager.beginTransaction).toHaveBeenCalled();
//       expect(mockTransactionManager.rollback).toHaveBeenCalled();
//     });
//   });

//   describe('deleteFile', () => {
//     it('should delete a file successfully', async () => {
//       await cloudinaryService.deleteFile('test-public-id');
      
//       const cloudinary = require('cloudinary');
//       expect(cloudinary.v2.uploader.destroy).toHaveBeenCalledWith('test-public-id', expect.any(Object));
//       expect(mockTransactionManager.beginTransaction).toHaveBeenCalled();
//       expect(mockTransactionManager.commit).toHaveBeenCalled();
//     });

//     it('should handle errors during deletion', async () => {
//       // Mock the cloudinary uploader to throw an error
//       const cloudinary = require('cloudinary');
//       cloudinary.v2.uploader.destroy.mockRejectedValueOnce(new Error('Deletion failed'));

//       await expect(cloudinaryService.deleteFile('test-public-id')).rejects.toThrow('Failed to delete file');
      
//       expect(mockTransactionManager.beginTransaction).toHaveBeenCalled();
//       expect(mockTransactionManager.rollback).toHaveBeenCalled();
//     });
//   });

//   describe('getTransformedUrl', () => {
//     it('should generate a transformation URL correctly', () => {
//       const url = cloudinaryService.getTransformedUrl('test-public-id', {
//         width: 200,
//         height: 200,
//         crop: 'fill'
//       });

//       expect(url).toBe('https://res.cloudinary.com/test/image/upload/test-public-id');
//     });
//   });

//   describe('getFileDetails', () => {
//     it('should retrieve file details successfully', async () => {
//       const details = await cloudinaryService.getFileDetails('test-public-id');
      
//       expect(details).toBeDefined();
//       expect(details.publicId).toBe('test-public-id');
//       expect(mockTransactionManager.beginTransaction).toHaveBeenCalled();
//       expect(mockTransactionManager.commit).toHaveBeenCalled();
//     });

//     it('should handle errors when retrieving file details', async () => {
//       // Mock the cloudinary api to throw an error
//       const cloudinary = require('cloudinary');
//       cloudinary.v2.api.resource.mockRejectedValueOnce(new Error('Resource not found'));

//       await expect(cloudinaryService.getFileDetails('test-public-id')).rejects.toThrow('Failed to get file details');
      
//       expect(mockTransactionManager.beginTransaction).toHaveBeenCalled();
//       expect(mockTransactionManager.rollback).toHaveBeenCalled();
//     });
//   });
// });
