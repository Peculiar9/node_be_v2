// import { Request, Response, NextFunction } from 'express';
// import { injectable, inject } from 'inversify';
// import { TYPES } from '../Core/Types/Constants';
// import { AuthService } from '../Infrastructure/Services/AuthService';
// import { AuthenticationError, ForbiddenError } from '../Core/Application/Error/AppError';
// import { ResponseMessage } from '../Core/Application/Response/ResponseFormat';
// import { UserRepository } from '../Infrastructure/Repository/SQL/users/UserRepository';
// import { DIContainer } from '../Core/DIContainer';
// import { IAuthService } from '../Core/Application/Interface/Services/IAuthService';
// import { TransactionManager } from '../Infrastructure/Repository/SQL/Abstractions/TransactionManager';
// import { IUser } from '../Core/Application/Interface/Entities/auth-and-user/IUser';
// import { UserRole } from '../Core/Application/Enums/UserRole';
// import { ITokenService } from '../Core/Application/Interface/Services/ITokenService';
// import { IAuthenticationService } from '@/Core/Application/Interface/Services/IAuthenticationService';

// @injectable()
// export class AuthMiddleware {
//   // private static getTransactionManager(): TransactionManager {
//   //   return DIContainer.getInstance().get<TransactionManager>(TYPES.TransactionManager);
//   // }
//   // private readonly transactionManager: TransactionManager;
//   constructor(
//     // @inject(TYPES.AuthService) private authService: IAuthService,
//     // @inject(TYPES.UserRepository) private userRepository: UserRepository,
//     @inject(TYPES.TokenService) private tokenService: ITokenService,
//     @inject(TYPES.AuthenticationService) private authService: IAuthenticationService,
//   ) {
//     // this.transactionManager = AuthMiddleware.getTransactionManager();
//     // console.log('it got here auth middleware constructor', this.transactionManager);
//   }
  
//   public static authenticate() {
//     const middleware = AuthMiddleware.createInstance();
//     return async (req: Request, res: Response, next: NextFunction) => {
//       await middleware.authenticateInstance(req, res, next);
//     };
//   }

  
//   public static authenticateAdmin() {
//     const middleware = AuthMiddleware.createInstance();
//     return async (req: Request, res: Response, next: NextFunction) => {
//       await middleware.authenticateAdminInstance(req, res, next);
//     };
//   }

//   public static authenticateSuperAdmin() {
//     const middleware = AuthMiddleware.createInstance();
//     return async (req: Request, res: Response, next: NextFunction) => {
//       await middleware.authenticateSuperAdminInstance(req, res, next);
//     };
//   }

//   public static authenticateOptional() {
//     const middleware = AuthMiddleware.createInstance();
//     return async (req: Request, res: Response, next: NextFunction) => {
//       await middleware.authenticateOptionalInstance(req, res, next);
//     };
//   }

//   private static createInstance(): AuthMiddleware {
//     const container = DIContainer.getInstance();
//     const authService = container.get<IAuthenticationService>(TYPES.AuthenticationService);
//     const tokenService = container.get<ITokenService>(TYPES.TokenService);
//     return new AuthMiddleware(tokenService, authService);
//   }
  
//   private authenticateInstance = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const token = this.extractToken(req);
//       const user = await this.validateTokenAndUser(token);
//       req.user = user;
//       next();
//     } catch (error: any) {
//       this.handleAuthError(res, error);
//     }
//   };

//   private authenticateAdminInstance = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const token = this.extractToken(req);
//       if(token === 'undefined' || token === null || token === '' || !token) {
//         throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
//       }
//       const user = await this.validateTokenAndUser(token, UserRole.ADMIN);
//       console.log('user', user);
//       req.user = user;
//       next();
//     } catch (error: any) {
//       this.handleAuthError(res, error);
//     }
//   };

//   private authenticateSuperAdminInstance = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const token = this.extractToken(req);
//       if(token === 'undefined' || token === null || token === '' || !token) {
//         throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
//       }
//       const user = await this.validateTokenAndUser(token, UserRole.SUPER_ADMIN);
//       console.log('user', user);
//       req.user = user;
//       next();
//     } catch (error: any) {
//       this.handleAuthError(res, error);
//     }
//   };

//   private authenticateOptionalInstance = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const token = this.extractTokenOptional(req);
//       if (token) {
//         const user = await this.validateTokenAndUser(token);
//         req.user = user;
//       }
//       next();
//     } catch (error: any) {
//       // Optionally log the error, but proceed as unauthenticated.
//       console.log('Optional authentication failed:', error.message);
//       next();
//     }
//   };

//   private extractToken(req: Request): string {
//     const authHeader = req.headers.authorization;
//     console.log("Request Header: ", req.headers);
//     if (!authHeader) {
//       throw new AuthenticationError(ResponseMessage.INVALID_AUTH_HEADER_MESSAGE);
//     }

//     const [bearer, token] = authHeader.split(' ');
//     if (bearer !== 'Bearer' || !token) {
//       throw new AuthenticationError(ResponseMessage.INVALID_AUTH_HEADER_MESSAGE);
//     }

//     return token;
//   }

//   private extractTokenOptional(req: Request): string | null {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//       return null;
//     }
//     const [bearer, token] = authHeader.split(' ');
//     if (bearer !== 'Bearer' || !token) {
//       return null;
//     }
//     return token;
//   }

//   private async validateTokenAndUser(token: string, requiredRole?: UserRole) {
//     console.log("it got here validate token and user");
//     const decodedToken = await this.authService.verifyToken(token);
//     const user: IUser = await this.authService.validateUser(decodedToken.sub as string);
//     console.log('user', user);
//     if (requiredRole && !user?.roles?.includes(requiredRole)) {
//       throw new ForbiddenError(ResponseMessage.INSUFFICIENT_PRIVILEDGES_MESSAGE);
//     }
//     return user;
//   }

//   private handleAuthError(res: Response, error: any): Response {
//     const statusCode = error instanceof AuthenticationError ? 401 :
//       error instanceof ForbiddenError ? 403 : 500;

//     return res.status(statusCode).json({
//       success: false,
//       message: error.message || ResponseMessage.INTERNAL_SERVER_ERROR_MESSAGE,
//       error_code: error.errorCode || 0,
//     });
//   }
// }

// export default AuthMiddleware;
