// import { TransactionManager } from "../../Repository/SQL/Abstractions/TransactionManager";
// import { DatabaseIsolationLevel } from "../../../Core/Application/Enums/DatabaseIsolationLevel";
// import { Console, LogLevel } from "../../Utils/Console";
// import { AuthServiceHelper } from "./AuthServiceHelper";
// import { IUser, VerificationStatus } from "../../../Core/Application/Interface/Entities/auth-and-user/IUser";
// import { UserResponseDTO } from "../../../Core/Application/DTOs/UserDTO";
// import { UserRole } from "../../../Core/Application/Enums/UserRole";
// import * as jwt from "jsonwebtoken";
// import { UtilityService } from "../../../Core/Services/UtilityService";
// import { AuthenticationError } from "../../../Core/Application/Error/AppError";
// import { ResponseMessage } from "../../../Core/Application/Response/ResponseFormat";
// import CryptoService from "../../../Core/Services/CryptoService";
// import { IVerification, VerificationType } from "../../../Core/Application/Interface/Entities/auth-and-user/IVerification";
// import { inject } from "inversify";
// import { TYPES } from "../../../Core/Types/Constants";
// import { VerificationRepository } from "../../Repository/SQL/auth/VerificationRepository";

// /**
//  * Base helper class for auth-related services
//  * Provides common functionality for transaction handling and user object construction
//  */
// export abstract class BaseAuthServiceHelper {
//     constructor(
//         protected readonly transactionManager: TransactionManager,
//         protected readonly authServiceHelper: AuthServiceHelper,
//         protected readonly verificationRepository: VerificationRepository,
//     ) {}

//     /**
//      * Constructs a user object for response
//      * @param user User entity
//      * @returns User response DTO
//      */
//     protected constructUserObject(user: IUser): UserResponseDTO {
//         return {
//             id: user._id as string,
//             first_name: user.first_name || '',
//             last_name: user.last_name || '',
//             email: user.email || '',
//             phone: user.phone || '',
//             profile_image: user.profile_image || '',
//             roles: user.roles as UserRole[] || [],
//             status: user.status || '',
//             is_active: user.is_active || false,
//             created_at: user.created_at || '',
//             updated_at: user.updated_at || '',
//         };
//     }

//     /**
//      * Begins a transaction with proper error handling
//      * @returns True if transaction started successfully, false otherwise
//      */
//     protected async beginTransaction(isolationLevel?: DatabaseIsolationLevel, readOnlyFlag?: boolean): Promise<boolean> {
//         try {
//             await this.transactionManager.beginTransaction({ isolationLevel: isolationLevel || DatabaseIsolationLevel.READ_COMMITTED, readOnly: readOnlyFlag || false });
//             return true;
//         } catch (error: any) {
//             Console.error(error, {
//                 message: `Failed to begin transaction: ${error}`,
//                 level: LogLevel.ERROR
//             });
//             return false;
//         }
//     }

//     /**
//      * Commits a transaction with proper error handling
//      * @returns True if commit was successful, false otherwise
//      */
//     protected async commitTransaction(): Promise<boolean> {
//         try {
//             await this.transactionManager.commit();
//             return true;
//         } catch (error: any) {
//             Console.error(error, {
//                 message: `Failed to commit transaction: ${error}`,
//                 level: LogLevel.ERROR
//             });
//             return false;
//         }
//     }

//     /**
//      * Rolls back a transaction with proper error handling
//      * @returns True if rollback was successful, false otherwise
//      */
//     protected async rollbackTransaction(): Promise<boolean> {
//         try {
//             await this.transactionManager.rollback();
//             return true;
//         } catch (error: any) {
//             Console.error(error, {
//                 message: `Failed to rollback transaction: ${error}`,
//                 level: LogLevel.ERROR
//             });
//             return false;
//         }
//     }

//     /**
//      * Generates JWT access and refresh tokens for a user
//      * @param user User entity
//      * @returns Object containing accessToken and refreshToken
//      */
//     protected async generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
//         const payload = {
//             sub: user._id,
//             email: user.email,
//             roles: user.roles,
//             type: 'access',
//         };

//         const secret = process.env.JWT_ACCESS_SECRET!;
//         console.log({ secret });

//         const accessToken = jwt.sign(
//             payload,
//             secret,
//             {
//                 expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
//                 jwtid: UtilityService.generateUUID(),
//             }
//         );

//         const refreshToken = jwt.sign(
//             { ...payload, type: 'refresh' },
//             process.env.JWT_REFRESH_SECRET!,
//             {
//                 expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
//                 jwtid: UtilityService.generateUUID(),
//             }
//         );

//         return { accessToken, refreshToken };
//     }

//     /**
//      * Verifies a JWT token
//      * @param token JWT token to verify
//      * @returns Decoded token payload if valid
//      * @throws AuthenticationError if token is invalid or expired
//      */
//     public async verifyToken(token: string): Promise<any> {
//         try {
//             console.log('it got here verify token', token);
//             const secret = process.env.JWT_ACCESS_SECRET;
//             console.log('secret', secret);

//             console.log('About to verify token...');
//             const decoded = jwt.verify(token, secret!);
//             console.log('Token verified successfully');
//             console.log('decoded token:', decoded);

//             if (!decoded) {
//                 throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
//             }

//             return decoded;
//         } catch (error: any) {
//             console.error('Token verification error:', {
//                 name: error.name,
//                 message: error.message,
//                 stack: error.stack
//             });
//             if (error.name === 'TokenExpiredError') {
//                 throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
//             }
//             throw new AuthenticationError(error.message);
//         }
//     }

//     protected async _createEmailVerificationRecord(userId: string, email: string, code: string, salt: string): Promise<IVerification> {
//         const hashedCode = await CryptoService.hashString(code, salt);
//         const verificationObject: IVerification = {
//             user_id: userId,
//             status: VerificationStatus.PENDING,
//             type: VerificationType.EMAIL,
//             identifier: email,
//             reference: UtilityService.generateUUID(),
//             otp: {
//                 code: hashedCode,
//                 attempts: 0,
//                 expiry: UtilityService.dateToUnix(Date.now() + 30 * 60 * 1000), // 30 minutes for email
//                 last_attempt: UtilityService.dateToUnix(new Date()),
//                 verified: false
//             },
//             expiry: UtilityService.dateToUnix(new Date(Date.now() + 180 * 60 * 1000)), // 3 hours for email verification process
//         };

//         return await this.verificationRepository.create(verificationObject);
//     }

//     protected async isVerificationExpired(expiry: number): Promise<boolean> {
//         return UtilityService.dateToUnix(Date.now()) > expiry;
//     }
// }
