import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../Core/Types/Constants';
import { AuthenticationError, ForbiddenError } from '../Core/Application/Error/AppError';
import { ResponseMessage } from '../Core/Application/Response/ResponseFormat';
import { DIContainer } from '../Core/DIContainer';
import { IUser } from '../Core/Application/Interface/Entities/auth-and-user/IUser';
import { UserRole } from '../Core/Application/Enums/UserRole';
import { AuthenticationService } from '../Infrastructure/Services/AuthenticationService';
import { IAuthenticationService } from '../Core/Application/Interface/Services/IAuthenticationService';

@injectable()
export class AuthMiddleware {
  // private static getTransactionManager(): TransactionManager {
  //   return DIContainer.getInstance().get<TransactionManager>(TYPES.TransactionManager);
  // }
  constructor(
    @inject(TYPES.AuthenticationService) private authenticationService: IAuthenticationService,
  ) {
    // this.transactionManager = AuthMiddleware.getTransactionManager();
    // console.log('it got here auth middleware constructor', this.transactionManager);
  }

  public static authenticate() {
    const middleware = AuthMiddleware.createInstance();
    return async (req: Request, res: Response, next: NextFunction) => {
      await middleware.authenticateInstance(req, res, next);
    };
  }


  public static authenticateAdmin() {
    const middleware = AuthMiddleware.createInstance();
    return async (req: Request, res: Response, next: NextFunction) => {
      await middleware.authenticateOperatorInstance(req, res, next);
    };
  }



  public static authenticateOptional() {
    const middleware = AuthMiddleware.createInstance();
    return async (req: Request, res: Response, next: NextFunction) => {
      await middleware.authenticateOptionalInstance(req, res, next);
    };
  }

  private static createInstance(): AuthMiddleware {
    const container = DIContainer.getInstance();
    const authenticationService = container.get<AuthenticationService>(TYPES.AuthenticationService);
    return new AuthMiddleware(authenticationService);
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

  private authenticateOperatorInstance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = this.extractToken(req);
      if (token === 'undefined' || token === null || token === '' || !token) {
        throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
      }
      const user = await this.validateTokenAndUser(token, UserRole.OPERATOR);
      console.log('user', user);
      req.user = user;
      next();
    } catch (error: any) {
      this.handleAuthError(res, error);
    }
  };



  private authenticateOptionalInstance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = this.extractTokenOptional(req);
      if (token) {
        const user = await this.validateTokenAndUser(token);
        req.user = user;
      }
      next();
    } catch (error: any) {
      // Optionally log the error, but proceed as unauthenticated.
      console.log('Optional authentication failed:', error.message);
      next();
    }
  };

  private extractToken(req: Request): string {
    const authHeader = req.headers.authorization;
    console.log("Request Header: ", req.headers);
    if (!authHeader) {
      throw new AuthenticationError(ResponseMessage.INVALID_AUTH_HEADER_MESSAGE);
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new AuthenticationError(ResponseMessage.INVALID_AUTH_HEADER_MESSAGE);
    }

    return token;
  }

  private extractTokenOptional(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return null;
    }
    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      return null;
    }
    return token;
  }

  private async validateTokenAndUser(token: string, requiredRole?: UserRole) {
    console.log("it got here validate token and user");
    const decodedToken = await this.authenticationService.verifyToken(token);
    const user: IUser = await this.authenticationService.validateUser(decodedToken.sub as string);
    console.log('decodedToken from auth middleware', decodedToken)
    console.log('user from auth middleware', user);
    if (requiredRole && !user?.roles?.includes(requiredRole)) {
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
