import { controller, httpPost, httpGet, httpPut, requestBody } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { TYPES, API_PATH } from '../../Core/Types/Constants';
import { IAccountUseCase } from '../../Core/Application/Interface/UseCases/IAccountUseCase';
import { BaseController } from '../BaseController';
import { AuthMiddleware } from '../../Middleware/AuthMiddleware';
import { CreateUserDTO, UpdateUserDTO } from '../../Core/Application/DTOs/UserDTO';
import { ResponseMessage } from '../../Core/Application/Response/ResponseFormat';

@controller(`/${API_PATH}/auth`)
export class AccountController extends BaseController {

  constructor(
    @inject(TYPES.AccountUseCase) private accountUseCase: IAccountUseCase,
    @inject(TYPES.AuthMiddleware) authMiddleware: AuthMiddleware
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

  @httpPost('/register')
  async register(@requestBody() dto: CreateUserDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      console.log('it got here register')
      const result = await this.accountUseCase.register(dto);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPost('/login')
  async login(@requestBody() dto: { email: string; password: string }, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.login(dto.email, dto.password);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpGet('/profile', AuthMiddleware.authenticate)
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await this.accountUseCase.getUserProfile(userId);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  @httpPut('/profile', AuthMiddleware.authenticate)
  async updateProfile(@requestBody() dto: UpdateUserDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const userId = req.user.id;
      const result = await this.accountUseCase.updateProfile(userId, dto);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  // Admin-only endpoints
  @httpGet('/users', AuthMiddleware.authenticateAdmin)
  async getAllUsers(req: Request, res: Response) {
    try {
      const result = await this.accountUseCase.getAllUsers();
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }

  // Super Admin-only endpoints
  @httpPost('/admin/create', AuthMiddleware.authenticateSuperAdmin)
  async createAdmin(@requestBody() dto: CreateUserDTO, req: Request, res: Response) {
    try {
      this.HandleEmptyReqBody(req);
      const result = await this.accountUseCase.createAdmin(dto);
      return this.success(res, result, ResponseMessage.SUCCESSFUL_REQUEST_MESSAGE);
    } catch (error: any) {
      return this.error(res, error.message, error.statusCode);
    }
  }
}