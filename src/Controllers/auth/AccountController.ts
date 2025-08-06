import { controller, httpDelete, httpGet, httpPost, httpPut, request, requestBody, response } from 'inversify-express-utils';
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
    RefreshTokenDTO,
    LoginDTO,
    EmailSetupPasswordDTO,
} from '../../Core/Application/DTOs/AuthDTO';
import { EmailSignUpDTO, VerifyEmailDTO } from '../../Core/Application/DTOs/AuthDTO';
import { IUser } from '../../Core/Application/Interface/Entities/auth-and-user/IUser';
import { validationMiddleware } from '../../Middleware/ValidationMiddleware';
import { AuthMiddleware } from '../../Middleware/AuthMiddleware';
import { uploadSingle } from '../../Middleware/MulterMiddleware';
import { ValidationError } from '../../Core/Application/Error/AppError';
import { AuthService } from '../../Infrastructure/Services/AuthService';
import { ITokenService } from '../../Core/Application/Interface/Services/ITokenService';

@controller(`/${API_PATH}/auth`)
export class AccountController extends BaseController {

  constructor(
    @inject(TYPES.AccountUseCase) private accountUseCase: IAccountUseCase,
    @inject(TYPES.AuthService) private authService: AuthService,
    @inject(TYPES.TokenService) private tokenService: ITokenService,
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

  @httpDelete('/delete')
  async delete(@requestBody() dto: {email: string}, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.removeUser(dto.email);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/resend-email-verification')
  async resendEmailVerification(@requestBody() dto: { email: string, reference: string }, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.resendEmailVerification(dto.email, dto.reference);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/verify-email', validationMiddleware(VerifyEmailDTO))
  async verifyEmail(@requestBody() dto: VerifyEmailDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.verifyEmailCode(dto);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      throw error;
    }
  }

  @httpPost('/email', validationMiddleware(EmailSignUpDTO))
  async emailSignup(@requestBody() dto: EmailSignUpDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.preSignUpEmail(dto);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
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
      dto.image = req.file as Express.Multer.File;
      console.log("MimeType: ", dto.image?.mimetype);
      const result = await this.accountUseCase.register(dto, user);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REGISTRATION);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  // OAuth Callback endpoint with quick acknowledgment
  
  // @httpPost('/oauth', CallbackMiddleware.acknowledge(1000))
  @httpPost('/oauth')
  async oauthHandler(@requestBody() dto: any, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      console.log('it got here oauth', {dto});
      const decodedValue = await this.tokenService.verifyToken(dto.authorization as string);
      // const decodedValue = await this.accountUseCase.decodeToken(dto.authorization.trim());
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

  // @httpGet("/generate-token")
  // async generateOAuthToken(req: Request, res: Response) {
  //   try {
  //     this.HandleEmptyReqBody(req);
  //     const result = await this.tokenService.generateOAuthToken();
  //     return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
  //   } catch (error: any) {
  //     return this.error(res, error.message, error.statusCode);
  //   }
  // }

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

  @httpPost('/loginV2', validationMiddleware(LoginDTO))
  async loginV2(@requestBody() dto: LoginDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.login(dto.identifier, dto.password);
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

  @httpPost('/profile-image', AuthMiddleware.authenticate(), uploadSingle('profile_image'))
  async updateProfileImage(req: Request, res: Response) {
    try {
      if (!req.file) {
         throw new ValidationError(ResponseMessage.MISSING_REQUIRED_FIELDS);
      }
      console.log("req.file the file from the profile image upload: ", req.file);
      
      const result = await this.accountUseCase.updateProfileImage(req.file as Express.Multer.File, req.user as IUser);
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

  @httpPost('/email/setup-password', validationMiddleware(EmailSetupPasswordDTO))
  async setupEmailPassword(@requestBody() dto: EmailSetupPasswordDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.setupEmailPassword(dto);
      return this.success(res, result, ResponseMessage.PASSWORD_SETUP_SUCCESS);
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

  @httpPost('/refresh', validationMiddleware(RefreshTokenDTO))
  async refresh(@requestBody() dto: RefreshTokenDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      
      const result = await this.accountUseCase.refreshToken(dto.refresh_token);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  // @httpPost('/request-password-reset', /*validationMiddleware(RequestPasswordResetDTO)*/)
  // async requestPasswordReset(@requestBody() dto: RequestPasswordResetDTO, req: Request, res: Response) {
  //   try {
  //     this.HandleEmptyReqBody(req);
  //     const email = dto.email as string;
  //     console.log("email: ", email);
  //     // await this.accountUseCase.requestPasswordReset(email);
  //     await this.accountUseCase.requestPasswordResetOTP(email);
  //     // Don't reveal if the email exists in our system for security reasons
  //     return this.success(res, { message: 'If the email exists in our system, a password reset link has been sent.' }, ResponseMessage.PASSWORD_RESET_EMAIL_SENT);
  //   } catch (error: any) {
  //     return this.error(res, error.message, error.statusCode);
  //   }
  // }

  // @httpPost('/reset-password', validationMiddleware(ResetPasswordDTO))
  // async resetPassword(@requestBody() dto: ResetPasswordDTO, req: Request, res: Response) {
  //   try {
  //     this.HandleEmptyReqBody(req);
      
  //     const result = await this.accountUseCase.resetPassword(dto.token, dto.newPassword);
  //     return this.success(res, { success: result }, ResponseMessage.PASSWORD_RESET_SUCCESS);
  //   } catch (error: any) {
  //     return this.error(res, error.message, error.statusCode);
  //   }
  // }

  // @httpPost('/reset-password-otp', /*validationMiddleware(ResetPasswordWithOtpDTO)*/)
  //   async resetPasswordWithOtp(@requestBody() dto: ResetPasswordWithOtpDTO, @request() req: Request, @response() res: Response) {
  //       try {
  //           this.HandleEmptyReqBody(req);
  //           // This would call a new method in your use case
  //           const success = await this.accountUseCase.resetPasswordWithOtp(dto.email, dto.otp, dto.newPassword);

  //           if (success) {
  //               return this.success(res, { message: 'Password has been reset successfully.' }, ResponseMessage.PASSWORD_RESET_SUCCESS);
  //           } else {
  //               return this.error(res, "Invalid OTP or email, or the OTP has expired.", 400);
  //           }
  //       } catch (error: any) {
  //           return this.error(res, error.message, error.statusCode);
  //       }
  //   }
  
}
