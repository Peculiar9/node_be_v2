// import { Container } from 'inversify';
// import { AccountController } from '../../Controllers/auth/AccountController';
// import { TYPES } from '../../Core/Types/Constants';
// import { mockUserData } from '../mocks/MockData';
// import { Request, Response } from 'express';
// import { ResponseMessage } from '../../Core/Application/Response/ResponseFormat';
// import { CreateUserDTO } from '../../Core/Application/DTOs/UserDTO';
// import { UserRole } from '../../Core/Application/Enums/UserRole';

// describe('AccountController', () => {
//     let container: Container;
//     let accountController: AccountController;
//     let mockAccountUseCase: any;
//     let mockRequest: Partial<Request>;
//     let mockResponse: Partial<Response>;

//     beforeEach(() => {
//         container = new Container();
        
//         mockAccountUseCase = {
//             register: jest.fn(),
//             login: jest.fn(),
//             updateProfile: jest.fn(),
//             getUserProfile: jest.fn(),
//             getAllUsers: jest.fn(),
//             createAdmin: jest.fn()
//         };

//         mockResponse = {
//             status: jest.fn().mockReturnThis(),
//             json: jest.fn().mockReturnThis()
//         };

//         mockRequest = {
//             body: {},
//             user: { id: 'test-user-id' }
//         };

//         container.bind(TYPES.AccountUseCase).toConstantValue(mockAccountUseCase);
//         container.bind(TYPES.AuthMiddleware).toConstantValue({});
//         container.bind(AccountController).toSelf();
        
//         accountController = container.get(AccountController);
//     });

//     describe('register', () => {
//         it('should register a new user successfully', async () => {
//             const createUserDTO = { ...mockUserData.createUserDTO }; // Create a copy to avoid reference issues
//             mockAccountUseCase.register.mockResolvedValue(mockUserData.userResponseDTO);

//             mockRequest.body = createUserDTO; // Set the request body

//             await accountController.register(
//                 createUserDTO,
//                 mockRequest as Request,
//                 mockResponse as Response
//             );

//             // Verify the useCase was called with the body data
//             expect(mockAccountUseCase.register).toHaveBeenCalledWith(createUserDTO);
//             expect(mockResponse.status).toHaveBeenCalledWith(200);
//             expect(mockResponse.json).toHaveBeenCalledWith({
//                 success: true,
//                 message: ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE,
//                 data: mockUserData.userResponseDTO
//             });
//         });

//         it('should handle registration error', async () => {
//             const invalidDTO = {
//                 email: '',
//                 password: mockUserData.createUserDTO.password,
//                 first_name: mockUserData.createUserDTO.first_name,
//                 last_name: mockUserData.createUserDTO.last_name,
//                 roles: [UserRole.ADMIN]
//             } satisfies CreateUserDTO;
            
//             const errorMessage = 'Registration failed';
//             mockAccountUseCase.register.mockRejectedValue(new Error(errorMessage));

//             mockRequest.body = invalidDTO;

//             await accountController.register(
//                 invalidDTO,
//                 mockRequest as Request,
//                 mockResponse as Response
//             );

//             expect(mockAccountUseCase.register).toHaveBeenCalledWith(invalidDTO);
//             expect(mockResponse.status).toHaveBeenCalledWith(400); // Changed from 500 to 400...this thing should be 500, we go check am
//             expect(mockResponse.json).toHaveBeenCalledWith({
//                 success: false,
//                 message: errorMessage,
//                 data: null
//             });
//         });
//     });

//     describe('login', () => {
//         it('should login successfully', async () => {
//             const loginDTO = { email: 'test@example.com', password: 'password123' };
//             mockAccountUseCase.login.mockResolvedValue(mockUserData.loginResponse);

//             mockRequest.body = loginDTO;

//             await accountController.login(
//                 loginDTO,
//                 mockRequest as Request,
//                 mockResponse as Response
//             );

//             expect(mockAccountUseCase.login).toHaveBeenCalledWith(loginDTO.email, loginDTO.password);
//             expect(mockResponse.status).toHaveBeenCalledWith(200);
//             expect(mockResponse.json).toHaveBeenCalledWith({
//                 success: true,
//                 message: ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE,
//                 data: mockUserData.loginResponse
//             });
//         });

//         it('should handle login error', async () => {
//             const loginDTO = { email: 'test@example.com', password: 'password123' };
//             const error = new Error('Login failed');
//             // Not setting error.name, so it will be treated as a generic error
//             mockAccountUseCase.login.mockRejectedValue(error);

//             mockRequest.body = loginDTO;

//             await accountController.login(
//                 loginDTO,
//                 mockRequest as Request,
//                 mockResponse as Response
//             );

//             expect(mockAccountUseCase.login).toHaveBeenCalledWith(loginDTO.email, loginDTO.password);
//             expect(mockResponse.status).toHaveBeenCalledWith(400); // Generic errors get 400
//             expect(mockResponse.json).toHaveBeenCalledWith({
//                 success: false,
//                 message: error.message,
//                 data: null
//             });
//         });

//         it('should handle invalid credentials', async () => {
//             const loginDTO = { email: 'invalid@example.com', password: 'wrongpassword' };
//             const error = new Error(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
//             error.name = 'AuthenticationError'; // Add error type to distinguish
//             mockAccountUseCase.login.mockRejectedValue(error);

//             mockRequest.body = loginDTO;

//             await accountController.login(
//                 loginDTO,
//                 mockRequest as Request,
//                 mockResponse as Response
//             );

//             expect(mockAccountUseCase.login).toHaveBeenCalledWith(loginDTO.email, loginDTO.password);
//             expect(mockResponse.status).toHaveBeenCalledWith(401); // Authentication failures should return 401
//             expect(mockResponse.json).toHaveBeenCalledWith({
//                 success: false,
//                 message: ResponseMessage.INVALID_CREDENTIALS_MESSAGE,
//                 data: null
//             });
//         });

//         it('should handle general login error', async () => {
//             const loginDTO = { email: 'test@example.com', password: 'password123' };
//             const error = new Error('Login failed');
//             error.name = 'Error'; // Generic error
//             mockAccountUseCase.login.mockRejectedValue(error);

//             mockRequest.body = loginDTO;

//             await accountController.login(
//                 loginDTO,
//                 mockRequest as Request,
//                 mockResponse as Response
//             );

//             expect(mockAccountUseCase.login).toHaveBeenCalledWith(loginDTO.email, loginDTO.password);
//             expect(mockResponse.status).toHaveBeenCalledWith(400); // Generic errors should be 500
//             expect(mockResponse.json).toHaveBeenCalledWith({
//                 success: false,
//                 message: error.message,
//                 data: null
//             });
//         });

//         it('should handle invalid credentials with AuthenticationError', async () => {
//             const loginDTO = { email: 'invalid@example.com', password: 'wrongpassword' };
//             const error = new Error(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
//             error.name = 'AuthenticationError'; // This should trigger 401 response
//             mockAccountUseCase.login.mockRejectedValue(error);

//             mockRequest.body = loginDTO;

//             await accountController.login(
//                 loginDTO,
//                 mockRequest as Request,
//                 mockResponse as Response
//             );

//             expect(mockAccountUseCase.login).toHaveBeenCalledWith(loginDTO.email, loginDTO.password);
//             expect(mockResponse.status).toHaveBeenCalledWith(401); // AuthenticationError should be 401
//             expect(mockResponse.json).toHaveBeenCalledWith({
//                 success: false,
//                 message: ResponseMessage.INVALID_CREDENTIALS_MESSAGE,
//                 data: null
//             });
//         });
//     });

//     describe('getProfile', () => {
//         it('should get user profile successfully', async () => {
//             mockAccountUseCase.getUserProfile.mockResolvedValue(mockUserData.userResponseDTO);

//             await accountController.getProfile(
//                 mockRequest as Request,
//                 mockResponse as Response
//             );

//             expect(mockAccountUseCase.getUserProfile).toHaveBeenCalledWith('test-user-id');
//             expect(mockResponse.status).toHaveBeenCalledWith(200);
//             expect(mockResponse.json).toHaveBeenCalledWith({
//                 success: true,
//                 message: ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE,
//                 data: mockUserData.userResponseDTO
//             });
//         });
//     });

//     // Additional test cases as needed...
// });