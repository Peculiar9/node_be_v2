import { controller, httpGet, httpPost, httpPut, requestBody } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { TYPES, API_PATH } from '../../Core/Types/Constants';
import { IAccountUseCase } from '../../Core/Application/Interface/UseCases/IAccountUseCase';
import { BaseController } from '../BaseController';
import { CreateUserDTO, UpdateUserDTO } from '../../Core/Application/DTOs/UserDTO';
import { ResponseMessage } from '../../Core/Application/Response/ResponseFormat';
import { 
    PhoneLoginDTO, 
    PhoneSignUpDTO, 
    VerifyOTPDTO, 
    SetupPasswordDTO, 
    RegisterUserDTO,
    RefreshTokenDTO 
} from '../../Core/Application/DTOs/AuthDTO';
import { IUser } from '../../Core/Application/Interface/Entities/auth-and-user/IUser';
import { validationMiddleware } from '../../Middleware/ValidationMiddleware';
import { AuthMiddleware } from '../../Middleware/AuthMiddleware';

@controller(`/${API_PATH}/auth`)
export class AccountController extends BaseController {

  constructor(
    @inject(TYPES.AccountUseCase) private accountUseCase: IAccountUseCase,
  ) {
    super();
  }

  @httpGet('/get')
  async base(@requestBody() dto: CreateUserDTO, req: Request, res: Response) {
    try {
      return this.success(res, {}, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/phone', validationMiddleware(PhoneSignUpDTO))
  async phoneSignup(@requestBody() dto: PhoneSignUpDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.preSignUpPhone(dto);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/phone/verify', validationMiddleware(VerifyOTPDTO))
  async verifyPhone(@requestBody() dto: VerifyOTPDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.verifyPhone(dto);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/phone/verify/resend', validationMiddleware(VerifyOTPDTO))
  async resendPhoneVerification(@requestBody() dto: VerifyOTPDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.resendVerification(dto);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  //if the verification takes more time than the treshold for users to return to it. They have to restart
  @httpPost('/phone/verify/restart', validationMiddleware(VerifyOTPDTO))
  async handleExpiredVerification(@requestBody() dto: VerifyOTPDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.resendVerification(dto);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/register', AuthMiddleware.authenticate(), validationMiddleware(RegisterUserDTO))
  async register(@requestBody() dto: RegisterUserDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      console.log('AccountController::register -> ', dto);
      const user = req.user as IUser;
      const result = await this.accountUseCase.register(dto, user);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REGISTRATION);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/oauth')
  async oauthHandler(@requestBody() dto: any, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      console.log('it got here oauth', {dto});
      const decodedValue = await this.accountUseCase.decodeToken(dto.authorization)
      const result = await this.accountUseCase.oauth(decodedValue.user_data);
      
      // Only send response if the acknowledgment hasn't been sent yet
      if (!res.headersSent) {
        return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
      }
    } catch (error: any) {
      // Only send error if the acknowledgment hasn't been sent yet
      if (!res.headersSent) {
        return this.error(res, error.message, error.statusCode);
      }
      // Log error even if we can't send it to the client
      console.error('OAuth processing error:', error);
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/login', validationMiddleware(PhoneLoginDTO))
  async login(@requestBody() dto: PhoneLoginDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.login(dto.international_phone, dto.password);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      // Check error type to determine status code
      const statusCode = error.name === 'AuthenticationError' ? 401 : 400;
      return this.error(res, error.message, statusCode);
    }
  }

  @httpGet('/profile', AuthMiddleware.authenticate())
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await this.accountUseCase.getUserProfile(userId, req.user as IUser);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPut('/profile', AuthMiddleware.authenticate())
  async updateProfile(@requestBody() dto: UpdateUserDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const userId = req.user.id;
      const result = await this.accountUseCase.updateProfile(userId, dto, req.user as IUser);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/logout', AuthMiddleware.authenticate())
  async logout(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      await this.accountUseCase.logout(userId);
      return this.success(res, {}, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpGet('/users', AuthMiddleware.authenticateAdmin())
  async getAllUsers(req: Request, res: Response) {
    try {
      const result = await this.accountUseCase.getAllUsers();
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/admin/create', AuthMiddleware.authenticateSuperAdmin())
  async createAdmin(@requestBody() dto: CreateUserDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.createAdmin(dto);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/phone/setup-password', validationMiddleware(SetupPasswordDTO))
  async setupPassword(@requestBody() dto: SetupPasswordDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.setupPassword(dto);
      return this.success(res, result, ResponseMessage.PASSWORD_SETUP_SUCCESS);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/refresh-token', validationMiddleware(RefreshTokenDTO))
  async refreshToken(@requestBody() dto: RefreshTokenDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.refreshToken(dto.refresh_token);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }
}
