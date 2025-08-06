import { BASE_PATH } from "../../Core/Types/Constants";
import { controller, httpGet, httpPost, request, requestBody, response } from "inversify-express-utils";
import { BaseController } from "../BaseController";
import { ResponseMessage } from "../../Core/Application/Response/ResponseFormat";
import { Request, Response } from "express";
import { RegisterUserDTOV2 } from "../../Core/Application/DTOs/AuthDTOV2";
import { inject } from "inversify";
import { TYPES } from "../../Core/Types/Constants";
import { IAuthUseCase } from "../../Core/Application/Interface/UseCases/IAuthUseCase";
import { EmailLoginDTO, RefreshTokenDTO, VerifyEmailDTO } from "../../Core/Application/DTOs/AuthDTO";
import AuthMiddleware from "../../Middleware/AuthMiddleware";
import { IUser } from "../../Core/Application/Interface/Entities/auth-and-user/IUser";
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

    @httpPost("/register")
    async register(@requestBody() dto: RegisterUserDTOV2, req: Request, res: Response) {
        try {
            this.HandleEmptyReqBody(req);
            console.log('AuthController::register -> ', dto);
            const result = await this.authUseCase.register(dto);
            return this.success(res, result, ResponseMessage.SUCCESSFUL_REGISTRATION);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    @httpPost("/verify-email")
    async verifyEmail(@requestBody() dto: VerifyEmailDTO, req: Request, res: Response) {
        try {
            this.HandleEmptyReqBody(req);
            console.log('AuthController::verifyEmail -> ', dto);
            const result = await this.authUseCase.verifyEmail(dto);
            return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    @httpPost("/resend-email-verification")
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

    @httpPost("/login")
    async login(@requestBody() dto: EmailLoginDTO, req: Request, res: Response) {
        try {
            this.HandleEmptyReqBody(req);
            console.log('AuthController::login -> ', dto);
            // const result = await this.authUseCase.login(dto);
            return this.success(res, {}, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
        } catch (error: any) {
            return this.error(res, error.message, error.statusCode);
        }
    }

    @httpPost("/profile-image-upload", AuthMiddleware.authenticate(), uploadSingle('profile_image'))
    async profileImageUpload(@request() req: Request, @response() res: Response) {
        try {
            const result = await this.authUseCase.updateProfileImage(req.file as Express.Multer.File, req.user as IUser);
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
}
