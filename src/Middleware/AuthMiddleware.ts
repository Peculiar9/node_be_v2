import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../Core/Types/Constants';
import { AuthService } from '../Infrastructure/Services/AuthService';
import { AuthenticationError, ForbiddenError } from '../Core/Application/Error/AppError';
import { ResponseMessage } from '../Core/Application/Response/ResponseFormat';
import { UserType } from '../Core/Application/Enums/UserType';
import { UserRepository } from '../Infrastructure/Repository/SQL/users/UserRepository';
import { DIContainer } from '../Core/DIContainer';

@injectable()
export class AuthMiddleware {
  constructor(
    @inject(TYPES.AuthService) private authService: AuthService,
    @inject(TYPES.UserRepository) private userRepository: UserRepository
  ) {}

  public static authenticate() {
    const middleware = AuthMiddleware.createInstance();
    return async (req: Request, res: Response, next: NextFunction) => {
      await middleware.authenticateInstance(req, res, next);
    };
  }

  public static authenticateAdmin() {
    const middleware = AuthMiddleware.createInstance();
    return async (req: Request, res: Response, next: NextFunction) => {
      await middleware.authenticateAdminInstance(req, res, next);
    };
  }

  public static authenticateSuperAdmin() {
    const middleware = AuthMiddleware.createInstance();
    return async (req: Request, res: Response, next: NextFunction) => {
      await middleware.authenticateSuperAdminInstance(req, res, next);
    };
  }

  private static createInstance(): AuthMiddleware {
    const container = DIContainer.getInstance();
    const authService = container.get<AuthService>(TYPES.AuthService);
    const userRepository = container.get<UserRepository>(TYPES.UserRepository);
    return new AuthMiddleware(authService, userRepository);
  }
  
  private authenticateInstance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = this.extractToken(req);
      const user = await this.validateTokenAndUser(token);
      req.user = user;
      next();
    } catch (error: any) {
      this.handleAuthError(res, error);
    }
  };

  private authenticateAdminInstance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = this.extractToken(req);
      const user = await this.validateTokenAndUser(token, UserType.ADMIN);
      req.user = user;
      next();
    } catch (error: any) {
      this.handleAuthError(res, error);
    }
  };

  private authenticateSuperAdminInstance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = this.extractToken(req);
      const user = await this.validateTokenAndUser(token, UserType.SUPER_ADMIN);
      req.user = user;
      next();
    } catch (error: any) {
      this.handleAuthError(res, error);
    }
  };

  private extractToken(req: Request): string {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AuthenticationError(ResponseMessage.INVALID_AUTH_HEADER_MESSAGE);
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new AuthenticationError(ResponseMessage.INVALID_AUTH_HEADER_MESSAGE);
    }

    return token;
  }

  private async validateTokenAndUser(token: string, requiredRole?: UserType) {
    const decodedToken = await this.authService.verifyToken(token);
    const user = await this.userRepository.findById(decodedToken.id);

    if (!user) {
      throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
    }

    if (requiredRole && !user.roles.includes(requiredRole)) {
      throw new ForbiddenError(ResponseMessage.INSUFFICIENT_PRIVILEDGES_MESSAGE);
    }

    return user;
  }

  private handleAuthError(res: Response, error: any): Response {
    const statusCode = error instanceof AuthenticationError ? 401 :
      error instanceof ForbiddenError ? 403 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || ResponseMessage.INTERNAL_SERVER_ERROR_MESSAGE,
      error_code: error.errorCode || 0,
    });
  }
}

export default AuthMiddleware;
