import { BASE_PATH } from "@Core/Types/Constants";
import { controller, httpGet, httpPost, httpPut, request, requestBody, response } from "inversify-express-utils";
import { BaseController } from "../BaseController";
import { ResponseMessage } from "@Core/Application/Response/ResponseFormat";
import { Request, Response } from "express";
import { UserRegistrationDTO } from "@Core/Application/DTOs/AuthDTOV2";
import { inject } from "inversify";
import { TYPES } from "@Core/Types/Constants";
import { IAuthUseCase } from "@Core/Application/Interface/UseCases/IAuthUseCase";
import { ForgotPasswordDTO, ResetPasswordDTO, ChangePasswordDTO, RefreshTokenDTO, VerifyEmailDTO, LoginDTO } from "@Core/Application/DTOs/AuthDTO";
import AuthMiddleware from "../../Middleware/AuthMiddleware";
import { IUser } from "@Core/Application/Interface/Entities/auth-and-user/IUser";
import { uploadSingle } from "../../Middleware/MulterMiddleware";
import { validationMiddleware } from "../../Middleware/ValidationMiddleware";

@controller(`/${BASE_PATH}/auth`)
export class AuthController extends BaseController {
    constructor(
        @inject(TYPES.AuthUseCase) private readonly authUseCase: IAuthUseCase
    ) {
        super();
    }

    @httpGet("")
    async base(@response() res: Response) {
        try {
            return this.success(res, {}, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    @httpPost("/register", validationMiddleware(UserRegistrationDTO))
    async register(@requestBody() dto: UserRegistrationDTO, req: Request, res: Response) {
        try {
            this.HandleEmptyReqBody(req);
            console.log('AuthController::register -> ', dto);
            const result = await this.authUseCase.register(dto);
            return this.success(res, result, ResponseMessage.SUCCESSFUL_REGISTRATION);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    @httpPost("/resend-email-verification", validationMiddleware(VerifyEmailDTO))
    async resendEmailVerification(@requestBody() dto: VerifyEmailDTO, req: Request, res: Response) {
        try {
            this.HandleEmptyReqBody(req);
            console.log('AuthController::resendEmailVerification -> ', dto);
            const result = await this.authUseCase.resendEmailVerification(dto);
            return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    @httpPost("/login", validationMiddleware(LoginDTO))
    async login(@requestBody() dto: LoginDTO, req: Request, res: Response) {
        try {
            this.HandleEmptyReqBody(req);
            console.log('AuthController::login -> ', dto);
            const result = await this.authUseCase.login({
                identifier: dto.identifier,
                password: dto.password,
                loginType: dto.loginType
            });
            return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    @httpPost("/profile-image-upload", AuthMiddleware.authenticate(), uploadSingle('profile_image'))
    async profileImageUpload(@request() req: Request, @response() res: Response) {
        try {
            const user = res.locals.user as IUser;
            if (!req.file) {
                return this.error(res, "No file uploaded", 400);
            }
            const result = await this.authUseCase.updateProfileImage(req.file as Express.Multer.File, user);
            return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    @httpPost("/refresh", AuthMiddleware.authenticate(), validationMiddleware(RefreshTokenDTO))
    async refresh(@requestBody() dto: RefreshTokenDTO, @request() req: Request, @response() res: Response) {
        try {
            this.HandleEmptyReqBody(req);
            const result = await this.authUseCase.refresh(dto);
            return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    @httpPost("/logout", AuthMiddleware.authenticate())
    async logout(@request() req: Request, @response() res: Response) {
        try {
            const result = await this.authUseCase.logout();
            return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    /**
     * Request a password reset link
     * @route POST /api/v1/auth/forgot-password
     */
    @httpPost("/forgot-password", validationMiddleware(ForgotPasswordDTO))
    async forgotPassword(@requestBody() dto: ForgotPasswordDTO, @request() req: Request, @response() res: Response) {
        try {
            this.HandleEmptyReqBody(req);
            console.log('AuthController::forgotPassword -> ', dto.email);
            const result = await this.authUseCase.forgotPassword(dto);
            return this.success(res, result, "Password reset link has been sent to your email");
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    /**
     * Reset password using token
     * @route POST /api/v1/auth/reset-password
     */
    @httpPost("/reset-password", validationMiddleware(ResetPasswordDTO))
    async resetPassword(@requestBody() dto: ResetPasswordDTO, @request() req: Request, @response() res: Response) {
        try {
            this.HandleEmptyReqBody(req);
            console.log('AuthController::resetPassword -> token provided');
            const result = await this.authUseCase.resetPassword(dto);
            return this.success(res, result, "Password has been reset successfully");
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    /**
     * Change password for authenticated user
     * @route PUT /api/v1/auth/change-password
     */
    @httpPut("/change-password", AuthMiddleware.authenticate(), validationMiddleware(ChangePasswordDTO))
    async changePassword(@requestBody() dto: ChangePasswordDTO, @request() req: Request, @response() res: Response) {
        try {
            this.HandleEmptyReqBody(req);
            console.log('AuthController::changePassword -> request received');
            const user = res.locals.user as IUser;
            const result = await this.authUseCase.changePassword(dto, user);
            return this.success(res, result, "Password has been changed successfully");
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    /**
     * Get current user profile
     * @route GET /api/v1/auth/me
     */
    @httpGet("/me", AuthMiddleware.authenticate())
    async getCurrentUser(@request() req: Request, @response() res: Response) {
        try {
            console.log('AuthController::getCurrentUser -> request received');
            const user = res.locals.user as IUser;
            const result = await this.authUseCase.getCurrentUser(user);
            return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }
}
