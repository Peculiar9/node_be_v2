import { controller, httpGet, httpPost, httpPut, request, requestBody, response } from "inversify-express-utils";
import { BaseController } from "../BaseController";
import { inject } from "inversify";
import { TYPES } from "../../Core/Types/Constants";
import { IAccountUseCase } from "../../Core/Application/Interface/UseCases/IAccountUseCase";
import { Request, Response } from "express";
import { CreateUserDTO, UpdateUserDTO, UserProfileResponseDTO } from "../../Core/Application/DTOs/UserDTO";
import { validationMiddleware } from "../../Middleware/ValidationMiddleware";
import AuthMiddleware from "../../Middleware/AuthMiddleware";
import { uploadSingle } from "../../Middleware/MulterMiddleware";
import { IUser } from "../../Core/Application/Interface/Entities/auth-and-user/IUser";
import { ResponseMessage } from "../../Core/Application/Response/ResponseFormat";

@controller("/api/v1/accounts")
export class AccountController extends BaseController {
  constructor(
    @inject(TYPES.AccountUseCase) private readonly accountUseCase: IAccountUseCase
  ) {
    super();
  }

  @httpPost("/admin/create", AuthMiddleware.authenticate(), validationMiddleware(CreateUserDTO))
  async createAdmin(@requestBody() dto: CreateUserDTO, @request() req: Request, @response() res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.createAdmin(dto);
      return this.success(res, result, "Admin created successfully");
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPut("/profile", AuthMiddleware.authenticate())
  async updateProfile(@requestBody() dto: UpdateUserDTO, @request() req: Request, @response() res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const userId = (req as any).user?.id;
      const result = await this.accountUseCase.updateProfile(userId, dto, req.user as IUser);
      return this.success(res, result, "Profile updated successfully");
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpGet("/profile", AuthMiddleware.authenticate())
  async getUserProfile(@request() req: Request, @response() res: Response) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.accountUseCase.getUserProfile(userId);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost("/profile-image", AuthMiddleware.authenticate(), uploadSingle('profile_image'))
  async updateProfileImage(@request() req: Request, @response() res: Response) {
    try {
      if (!req.file) {
        return this.error(res, "No file uploaded", 400);
      }
      const result = await this.accountUseCase.updateProfileImage(req.file, req.user as IUser);
      return this.success(res, result, "Profile image updated successfully");
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }
}
