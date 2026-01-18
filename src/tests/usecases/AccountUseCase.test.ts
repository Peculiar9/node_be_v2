// import { Container } from 'inversify';
// import { AccountUseCase } from '@Core/Application/UseCases/AccountUseCase';
// import { TYPES } from '@Core/Types/Constants';
// import { TestUtils } from '../utils/TestUtils';
// import { mockUserData } from '../mocks/MockData';
// import { ValidationError } from '@Core/Application/Error/AppError';
// import { ResponseMessage } from '@Core/Application/Response/ResponseFormat';

// describe('AccountUseCase', () => {
//     let container: Container;
//     let accountUseCase: AccountUseCase;
//     let mockAuthService: any;
//     let mockUserService: any;

//     beforeEach(() => {
//         container = TestUtils.createMockContainer();
        
//         mockAuthService = TestUtils.createSpyObj('AuthService', [
//             'createUser',
//             'authenticate',
//             'getUserFromToken',
//             'updateUser'
//         ]);

//         mockUserService = TestUtils.createSpyObj('UserService', ['getAllUsers']);

//         container.bind(TYPES.AuthService).toConstantValue(mockAuthService);
//         container.bind(TYPES.UserService).toConstantValue(mockUserService);
//         container.bind(AccountUseCase).toSelf();

//         accountUseCase = container.get(AccountUseCase);
//     });

//     describe('register', () => {
//         it('should register a new user successfully', async () => {
//             mockAuthService.createUser.mockResolvedValue(mockUserData.userResponseDTO);

//             const result = await accountUseCase.register(mockUserData.createUserDTO);

//             expect(result).toEqual(mockUserData.userResponseDTO);
//             expect(mockAuthService.createUser).toHaveBeenCalledWith(
//                 expect.objectContaining(mockUserData.createUserDTO)
//             );
//         });

//         it('should throw error for invalid registration data', async () => {
//             await expect(accountUseCase.register(null as any))
//                 .rejects
//                 .toThrow(ResponseMessage.INVALID_REQUEST_MESSAGE);
//         });
//     });

//     describe('login', () => {
//         it('should login user successfully', async () => {
//             mockAuthService.authenticate.mockResolvedValue(mockUserData.loginResponse);

//             const result = await accountUseCase.login('test@example.com', 'password');

//             expect(result).toEqual(mockUserData.loginResponse);
//             expect(mockAuthService.authenticate).toHaveBeenCalledWith(
//                 'test@example.com',
//                 'password'
//             );
//         });

//         it('should throw error for missing credentials', async () => {
//             await expect(accountUseCase.login('', ''))
//                 .rejects
//                 .toThrow(ResponseMessage.EMAIL_PASSWORD_REQUIRED);
//         });
//     });

//     // Add more test cases for other methods...
// });
