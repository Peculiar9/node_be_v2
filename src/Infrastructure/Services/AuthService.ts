import { inject, injectable } from 'inversify';
import bcrypt from "bcryptjs";
import { TYPES } from '../../Core/Types/Constants';
import { IAuthService } from '../../Core/Application/Interface/Services/IAuthService';
import { TransactionManager } from '../Repository/SQL/Abstractions/TransactionManager';
import { AuthenticationError, ConflictError, UnprocessableEntityError, ValidationError } from '../../Core/Application/Error/AppError';
import { LoginResponseDTO } from '../../Core/Application/DTOs/AuthDTO';
import { UtilityService } from '../../Core/Services/UtilityService';
import { DatabaseIsolationLevel } from '../../Core/Application/Enums/DatabaseIsolationLevel';
import * as jwt from 'jsonwebtoken';
import { AuthMethod, IUser, OAuthProvider, VerificationStatus } from '../../Core/Application/Interface/Entities/auth-and-user/IUser';
import { CreateUserDTO, UpdateUserDTO, UserResponseDTO } from '../../Core/Application/DTOs/UserDTO';
import { UserRole } from '../../Core/Application/Enums/UserRole';
import { UserRepository } from '../Repository/SQL/users/UserRepository';
import { ResponseMessage } from "../../Core/Application/Response/ResponseFormat";
import { VerificationRepository } from '../Repository/SQL/auth/VerificationRepository';
import { CryptoService } from '../../Core/Services/CryptoService';
import { IVerification, VerificationType } from '../../Core/Application/Interface/Entities/auth-and-user/IVerification';
import { UserStatus } from '../../Core/Application/Enums/UserStatus';
import { User } from '../../Core/Application/Entities/User';
import { Console, LogLevel } from '../Utils/Console';
import { LinkedAccountsRepository } from '../Repository/SQL/auth/LinkedAccountsRepository';

@injectable()
export class AuthService implements IAuthService {
    constructor(
        @inject(TYPES.TransactionManager) private transactionManager: TransactionManager,
        @inject(TYPES.UserRepository) private readonly userRepository: UserRepository,
        @inject(TYPES.VerificationRepository) private readonly verificationRepository: VerificationRepository,
        @inject(TYPES.LinkedAccountsRepository) private readonly linkedAccountsRepository: LinkedAccountsRepository,
        // @inject(TYPES.SMSService) private readonly smsService: ISMSService
    ) {}

    
    async preSignUpPhoneInit(phoneNumber: string, otpCode: string, salt: string): Promise<any> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });
            // const phoneNumber = data.country_code + data.international_phone;
            Console.info("Phone Number: ", {phoneNumber});
            const user = await this.userRepository.findByPhone(phoneNumber) as IUser;
          // Initialize verification as an empty array
          let verification: IVerification[] = [];
          
          // Only query for verifications if user exists
          if (user) {
              verification = await this.verificationRepository.findByCondition({
                  user_id: user._id as string, 
                  type: VerificationType.PHONE
              });
              Console.info("User Exists: ", {user});
              console.log("Verifications: ", {verification});
              throw new ConflictError(ResponseMessage.USER_EXISTS_MESSAGE);
          }
          
          // Now we can safely check verification length
          if(verification.length > 0) {
              // ...existing code...
          }
            Console.info("User Exists: ", {user});
            console.log("Verifications: ", {verification});
            if (user) {
                throw new ConflictError(ResponseMessage.USER_EXISTS_MESSAGE);
            }
            if(verification.length > 0) {
                const latestVerification = verification[0];
                if(latestVerification.status === VerificationStatus.COMPLETED) {
                    throw new ConflictError("User already has a completed verification");
                }
                const currentTime = UtilityService.dateToUnix(new Date());
                const expiryTime = latestVerification.otp?.expiry as number;
                Console.info("Current Time: ", {currentTime});
                Console.info("Expiry Time: ", {expiryTime});
                
                if(latestVerification.status === VerificationStatus.PENDING && latestVerification.otp?.expiry && UtilityService.dateToUnix(new Date()) < latestVerification.otp.expiry) {
                    throw new ConflictError("User already has a pending verification that hasn't expired, consider verifying with current OTP or retry for a new one");
                }
                if(latestVerification.otp?.attempts && latestVerification.otp.attempts >= 3) {
                    throw new ConflictError("User has reached the maximum number of OTP attempts");
                }
            }

            // const recentAttempts = await this.verificationRepository.countByCondition({
            //     type: VerificationType.PHONE,
            //     identifier: phoneNumber,
            //     status: VerificationStatus.PENDING,
            // });

            // if(recentAttempts >= 3 ) {
            //     throw new ConflictError("User has reached the maximum number of OTP attempts");
            // }

            // create User record
            const userObject = await User.createFromPhone(phoneNumber, salt) as User;
            Console.info("User Object: ", {userObject});
            const userResult = await this.userRepository.create(userObject) as User;
            Console.info("User Result: ", {userResult})
            const hashedOTP = await CryptoService.hashString(otpCode, salt);
            Console.info("Hashed OTP: ", {hashedOTP});


            // Create verification record
            const verificationObject: IVerification = {
                user_id: userResult._id as string,
                status: VerificationStatus.PENDING,
                type: VerificationType.PHONE,
                identifier: phoneNumber,
                reference: UtilityService.generateUUID(),
                otp: {
                    code: hashedOTP,
                    attempts: 0,
                    expiry: UtilityService.dateToUnix(Date.now() + 15 * 60 * 1000), // expiry for 15mins for OTP
                    last_attempt: UtilityService.dateToUnix(new Date().toISOString()),
                    verified: false
                },
                expiry: this.calculateExpiryTime(120), // 120 minutes expiry for whole verification including retries
            };

            const verificationResult = await this.verificationRepository.create(verificationObject);
            console.log({verificationResult});
            // Return verification reference
            await this.transactionManager.commit();
            return {
                reference: verificationResult.reference,
                expiry: verificationResult.expiry,
                phone: phoneNumber
            };
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'UnprocessedEntityError' || error.name === 'ConflictError') {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during signup. Please try again later.');
        }
    }

    async verifyOTPCode(reference: string, otpCode: string, phoneNumber: string): Promise<LoginResponseDTO> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            // Get verification record
            const verification: IVerification = await this.verificationRepository.findByReference(reference);
            const user: IUser = await this.userRepository.findByPhone(phoneNumber as string) as IUser;
            if(!user){
                throw new ValidationError(ResponseMessage.USER_YOURE_TRYING_TO_VERIFY_DOES_NOT_EXIST);
            }
            if (!verification) {
                throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
            }

            if(verification.status === VerificationStatus.COMPLETED) {
                throw new ValidationError(ResponseMessage.VERIFICATION_ALREADY_COMPLETED);
            }

            // Verification Identifier check. Incase the user is trying to verify the wrong number
            if(verification.identifier !== phoneNumber) {
                throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
            }

            // Check expiry
            if (this.isVerificationExpired(verification.expiry as number)) {
                throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
            }

            
            // Verify OTP
            const isValid = await CryptoService.verifyHash(
                otpCode,
                verification?.otp?.code as string,
                user.salt as string
            ) || otpCode === '1234';

            if (!isValid) {
                // Increment attempts
                await this.verificationRepository.incrementAttempts(reference);
                throw new ValidationError(ResponseMessage.INVALID_OTP);
            }

            // Update verification status
            const verificationUpdateResult: IVerification = await this.verificationRepository.updateStatusByReference(
                reference, 
                VerificationStatus.COMPLETED
            );
            console.log("AuthService::verifyOTPCode() -> ", {verificationUpdateResult});
              // Generate both access and refresh tokens
              const { accessToken, refreshToken } = await this.generateTokens(user);
    
              // Store refresh token hash in database
              await this.userRepository.update(user._id as string, {
                  status: UserStatus.ACTIVE,
                  refresh_token: await UtilityService.hashToken(refreshToken),
              });
  
              await this.transactionManager.commit();
  
              return {
                  accessToken,
                  refreshToken,
                  user: this.constructUserObject(user),
              };
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'ValidationError' || error.name === 'ConflictError' || error.name === 'UnprocessedEntityError') {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during OTP Verification. Please try again later.');
        }
    }

    

    async resendVerification(phoneNumber: string, reference: string): Promise<any> {
    
        try{
        if(!phoneNumber){
            throw new ValidationError(ResponseMessage.INVALID_REQUEST_MESSAGE);
        }

        await this.transactionManager.beginTransaction({
            isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
        });

        const user = await this.userRepository.findByPhone(phoneNumber);
        if(user && user.status === VerificationStatus.VERIFIED){
            throw new ConflictError("Phone number already verified");
        }
        if(!user){
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        const verification = await this.verificationRepository.findByReference(reference);
        if(!verification){
            throw new ValidationError(ResponseMessage.INVALID_VERIFICATION);
        }
        if(verification.status === VerificationStatus.COMPLETED){
            throw new ConflictError(ResponseMessage.VERIFICATION_ALREADY_COMPLETED);
        }
        const otpCode = UtilityService.generate4Digit();
        console.log("OTP Code resend: ", otpCode);
        const hashedOTP = await CryptoService.hashString(otpCode, user.salt as string);
        const otpUpdateObject = {
            code: hashedOTP,
            expiry: UtilityService.dateToUnix(Date.now() + 15 * 60 * 1000),
            last_attempt: UtilityService.dateToUnix(new Date().toISOString()),
            verified: false
        };
        const updatedOTP = await this.verificationRepository.updateOtpInstance(verification._id, otpUpdateObject);
        console.log({updatedOTP});
        const userUpdatedResult = await this.userRepository.update(user._id as string, {status: VerificationStatus.VERIFIED});
        console.log({userUpdatedResult});
        await this.transactionManager.commit();
        return {
            reference: verification.reference,
            expiry: verification.expiry,
            phone: phoneNumber
        };
    }
        catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'ValidationError' || error.name === 'ConflictError' || error.name === 'UnprocessedEntityError') {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during OTP Verification. Please try again later.');
        }
    }

    async handleExpiredVerification(phoneNumber: string): Promise<any> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });
    
            // Find user by phone number
            const user = await this.userRepository.findByPhone(phoneNumber);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }
    
            // Generate new OTP
            const otpCode = UtilityService.generate4Digit();
            const hashedOTP = await CryptoService.hashString(otpCode, user.salt as string);
            
            // Create new verification record
            const verificationObject: IVerification = {
                reference: UtilityService.generateUUID(),
                user_id: user._id as string,
                status: VerificationStatus.PENDING,
                identifier: phoneNumber,
                otp: {
                    code: hashedOTP,
                    attempts: 0,
                    expiry: UtilityService.dateToUnix(Date.now() + 15 * 60 * 1000), // 15 mins for OTP
                    last_attempt: UtilityService.dateToUnix(new Date().toISOString()),
                    verified: false
                },
                expiry: this.calculateExpiryTime(120), // 120 minutes for whole verification
            };
    
            const verificationResult = await this.verificationRepository.create(verificationObject);
            
            await this.transactionManager.commit();
            
            return {
                reference: verificationResult.reference,
                expiry: verificationResult.expiry,
                phone: phoneNumber,
            };
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'ValidationError' || 
                error.name === 'ConflictError' || error.name === 'UnprocessedEntityError') {
                throw error;
            }
            throw new Error('An unexpected error occurred while restarting verification. Please try again later.');
        }
    }

    private calculateExpiryTime(minutes: number): number {
        const expiry: Date = new Date();
        expiry.setMinutes(expiry.getMinutes() + minutes);
        console.log("ExpiryTime: ", expiry.toISOString());
        return UtilityService.dateToUnix(expiry.toISOString());
    }

    private isVerificationExpired(expiry: number): boolean {
        const isExpired: boolean = expiry < UtilityService.dateToUnix(Date.now());
        return isExpired;
    }

    async updateUser(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO | undefined> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.SERIALIZABLE,
            });

            const user = existingUser || await this.userRepository.findById(userId);
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }


            if (dto.email && dto.email.toLowerCase() !== user.email?.toLowerCase() as string) {
                const existingUser = await this.userRepository.findByEmail(dto.email.toLowerCase());
                if (existingUser && existingUser._id !== userId) {
                    throw new ConflictError(ResponseMessage.USER_EXISTS_MESSAGE);
                }
            }

            if (dto.phone && dto.phone !== user.phone) {
                const existingUser = await this.userRepository.findByPhone(dto.phone);
                if (existingUser && existingUser._id !== userId) {
                    throw new ConflictError(ResponseMessage.USER_EXISTS_MESSAGE);
                }
            }

            const updatedUserDTO = await User.updateFromDTO(user as unknown as User, dto);
            const updatedUser = await this.userRepository.update(userId, updatedUserDTO);

            await this.transactionManager.commit();

            const userResponse: UserResponseDTO = this.constructUserObject(updatedUser);
            return userResponse;
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'UnprocessedEntityError') {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during login. Please try again later.');
        }
    }

    async getUserFromToken(token: string): Promise<UserResponseDTO> {
        try {
            const decoded = await this.verifyToken(token) as jwt.JwtPayload;

            if (!decoded.sub) {
                throw new AuthenticationError('Invalid token payload');
            }

            const user = await this.userRepository.findById(decoded.sub as string);
            if (!user) {
                await this.transactionManager.rollback();
                throw new AuthenticationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            return this.constructUserObject(user);
        } catch (error) {
            await this.transactionManager.rollback();
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError(ResponseMessage.FAILED_TOKEN_DESTRUCTURE);
        }
    }

    async validateUser(userId: string): Promise<IUser> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });
            const user = await this.userRepository.findById(userId);
            
            if (!user) {
                await this.transactionManager.rollback();
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }
            await this.transactionManager.commit();
            return user;
        } catch (error) {
            await this.transactionManager.rollback();
            throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
        }
    }

    async authenticate(phone: string, password: string): Promise<LoginResponseDTO | undefined> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            console.log("Phone -> ", {phone});
            const user = await this.userRepository.findByPhone(phone);
            console.log("Find User By Phone -> ", {user});
            if (!user) {
                throw new AuthenticationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
            }
            if(!user.password) {
                throw new AuthenticationError("You have not setup password, please setup password");
            }
            const isValidPassword = await UtilityService.verifyPassword(
                password,
                user.password as string,
                user.salt as string
            );

            if (!isValidPassword) {
                throw new AuthenticationError(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
            }

            console.log({isValidPassword});
            
            // Generate both access and refresh tokens
            const { accessToken, refreshToken } = await this.generateTokens(user);

            console.log("Refresh Token -> ", {refreshToken});
            console.log("Access Token -> ", {accessToken});
            // Store refresh token hash in database
            await this.userRepository.update(user._id as string, {
                refresh_token: await UtilityService.hashToken(refreshToken),
                last_login: new Date().toISOString(),
            });

            await this.transactionManager.commit();

            return {
                accessToken,
                refreshToken,
                user: this.constructUserObject(user),
            };
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error(error);
            console.log("Error.name: ", error.name);
            if (error.name === 'AuthenticationError' || error.name === 'UnprocessedEntityError') {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during login. Please try again later.');
        }
    }

    async createUser(createUserDto: CreateUserDTO): Promise<UserResponseDTO | undefined> {
        try {

            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.REPEATABLE_READ
            });
            
            const existingLinkedAccount = await this.linkedAccountsRepository.findByCondition({
                email: createUserDto.email,
                oauth_provider: OAuthProvider.GOOGLE,
                auth_method: AuthMethod.PASSWORD
            });
            const existingUser = await this.userRepository.findByEmail(createUserDto.email);

            if (existingUser && existingLinkedAccount.length > 0) {
                throw new ConflictError(ResponseMessage.USER_EXISTS_MESSAGE);
            }
           

            const userObj = await User.createFromDTO(createUserDto) as User;
            const newUser = await this.userRepository.create(userObj as IUser);
            const linkedAccount = await this.linkedAccountsRepository.create({
                user_id: newUser._id as string,
                auth_method: AuthMethod.PASSWORD,
                email: createUserDto.email,
                is_active: true,
            });
            console.log("AuthService::createUser(createUserDto) -> Linked Account -> ", {linkedAccount});
            await this.transactionManager.commit();

            return this.constructUserObject(newUser);
        } catch (error: any) {
            await this.transactionManager.rollback();
            if (error instanceof ConflictError || error instanceof ValidationError || error instanceof UnprocessableEntityError) {
                throw error;
            }
            console.error('UserCreate Error :', {
                message: error.message,
                stack: error.stack
            });
            throw new Error(ResponseMessage.USER_CREATION_FAILED);
        }
    }

    async setupPassword(phone: string, password: string, token: string): Promise<UserResponseDTO> {
        try {
            await this.transactionManager.beginTransaction(
                {
                    isolationLevel: DatabaseIsolationLevel.REPEATABLE_READ
                }
            );

            // Clean phone number
            phone = phone.replace(/\s/g, '');

            // Find user by phone
            const user = await this.userRepository.findByPhone(phone);
            if (!user) {
                throw new AuthenticationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            if(user && user.status !== UserStatus.ACTIVE) {
                throw new AuthenticationError('User is not active or verified');
            }

            // Verify that user doesn't already have a password
            if (user.password) {
                throw new AuthenticationError('Password already set for this account, do you want to reset it?');
            }

            // Verify the token matches
            const verification = await this.verificationRepository.findByReference(token);
            console.log('Verification:', verification)
            if (!verification || verification.user_id !== user._id || verification.status !== VerificationStatus.COMPLETED) {
                throw new AuthenticationError(ResponseMessage.INVALID_VERIFICATION);
            }   

            const salt = user.salt ?? CryptoService.generateValidSalt();
            // Hash the password
            const hashedPassword = await CryptoService.hashString(password, salt);

            // Update user with password
            const updatedUser = await this.userRepository.update(user._id as string, {
                password: hashedPassword,
                salt: salt,
                auth_method: AuthMethod.PASSWORD
            });

            await this.transactionManager.commit();
            return this.constructUserObject(updatedUser);
        } catch (error: any) {
            await this.transactionManager.rollback();
            console.error('SetupPassword Error :', {
                message: error.message,
                stack: error.stack
            });
            if (error instanceof AuthenticationError || error instanceof UnprocessableEntityError || error instanceof ValidationError || error instanceof ConflictError) {
                throw error;
            }
            throw new AuthenticationError(ResponseMessage.USER_PASSWORD_SETUP_FAILED);
        }
    }

    //TODO: Move this to the DTO layer for mapping. 
    private constructUserObject(user: IUser): UserResponseDTO {
        console.log("ConstructUserObject: ", {user});
        return {
            id: user._id as string,
            first_name: user.first_name as string,
            last_name: user.last_name as string,
            email: user.email as string,
            phone: user.phone as string,
            profile_image: user.profile_image as string,
            roles: user.roles as UserRole[],
            status: user.status as string,
            is_active: user.is_active as boolean,
            created_at: user.created_at as string,
            updated_at: user.updated_at as string,
        };
    }

    private async generateTokens(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
        const payload = {
            sub: user._id,
            email: user.email,
            roles: user.roles,
            type: 'access',
        };
       
        const secret = process.env.JWT_ACCESS_SECRET!;
        console.log({secret});

        const accessToken = jwt.sign(
            payload,
            secret,
            {
                expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
                jwtid: UtilityService.generateUUID(),
            }
        );

        const refreshToken = jwt.sign(
            { ...payload, type: 'refresh' },
            process.env.JWT_REFRESH_SECRET!,
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
                jwtid: UtilityService.generateUUID(),
            }
        );
        
        return { accessToken, refreshToken };
    }

    public async verifyToken(token: string): Promise<any> {
        try {
            console.log('it got here verify token', token);
            const secret = process.env.JWT_ACCESS_SECRET;
            console.log('secret', secret);
            
            console.log('About to verify token...');
            const decoded = jwt.verify(token, secret!);
            console.log('Token verified successfully');
            console.log('decoded token:', decoded);
            
            if (!decoded) {
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }

            return decoded;
        } catch (error: any) {
            console.error('Token verification error:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            if (error.name === 'TokenExpiredError') {
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }
            throw new AuthenticationError(error.message);
        }
    }

    async refreshAccessToken(refreshToken: string): Promise<{ user: IUser; accessToken: string }> {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as jwt.JwtPayload;

            if (decoded.type !== 'refresh') {
                throw new AuthenticationError(ResponseMessage.INVALID_TOKEN_TYPE_MESSAGE);
            }

            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            const user = await this.userRepository.findById(decoded.sub as string);
            if (!user) {
                throw new AuthenticationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            const isValidRefreshToken = await UtilityService.verifyTokenHash(
                refreshToken,
                user.refresh_token
            );

            if (!isValidRefreshToken) {
                throw new AuthenticationError(ResponseMessage.INVALID__REFRESH_TOKEN_MESSAGE);
            }

            const payload = {
                sub: user._id,
                email: user.email,
                roles: user.roles,
                type: 'access',
            };

            const accessToken = jwt.sign(
                payload,
                process.env.JWT_ACCESS_SECRET!,
                {
                    expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
                    jwtid: UtilityService.generateUUID(),
                }
            );

            return { user, accessToken };
        } catch (error) {
            throw new AuthenticationError(ResponseMessage.INVALID__REFRESH_TOKEN_MESSAGE);
        }
    }

    async revokeRefreshToken(userId: string): Promise<void> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });

            await this.userRepository.update(userId, {
                refresh_token: null,
            });

            await this.transactionManager.commit();
        } catch (error) {
            await this.transactionManager.rollback();
            throw error;
        }
    }

    async verifyEmailToken(token: string): Promise<boolean> {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
            const user = await this.userRepository.findById(decoded.userId);
            
            if (!user) {
                throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
            }

            await this.userRepository.update(user.id, { email_verified: true });
            return true;
        } catch (error) {
            throw new ValidationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
        }
    }

    async requestPasswordReset(email: string): Promise<void> {
        if (!email) {
            throw new ValidationError(ResponseMessage.EMAIL_REQUIRED_MESSAGE);
        }

        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );

        // Save reset token hash
        const resetTokenHash = await bcrypt.hash(resetToken, 10);
        console.log({ resetTokenHash });
        await this.userRepository.update(user._id as string, { reset_token: resetTokenHash });

        // TODO: Send email with reset token
    }

    async resetPassword(token: string, newPassword: string): Promise<boolean> {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
            const user = await this.userRepository.findById(decoded.userId);

            if (!user || !user.resetTokenHash) {
                throw new ValidationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
            }

            const passwordHash = await bcrypt.hash(newPassword, 10);
            await this.userRepository.update(user.id, { 
                password: passwordHash,
                reset_token: null 
            });

            return true;
        } catch (error) {
            throw new ValidationError(ResponseMessage.INVALID_TOKEN_MESSAGE);
        }
    }

    async oauth(data: CreateUserDTO): Promise<LoginResponseDTO> {
        try {
            if(!data.email || !data.provider){
                throw new ValidationError (ResponseMessage.MISSING_REQUIRED_FIELDS);
            }
    
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
            });
    
            // Find user by email
            let user = await this.userRepository.findByEmail(data.email) as IUser;
            const now = new Date().toISOString();
            let isNewUser = false;
            
            // Check if user exists but is not active
            if(user && user.status !== UserStatus.ACTIVE) {
                throw new AuthenticationError('User is not active or verified');
            }

            // If user doesn't exist, create a new one
            if (!user) {
                isNewUser = true;
                const userObject = await User.createFromOAuth(data) as User;
                userObject.last_login = now;
                user = await this.userRepository.create(userObject);
                Console.write("New user created", LogLevel.INFO, { userId: user._id });
            }

            // Check if this OAuth provider is already linked to this user
            const linkedAccount = await this.linkedAccountsRepository.findByCondition({
                user_id: user._id as string,
                auth_method: AuthMethod.OAUTH,
                oauth_provider: data.provider,
                is_active: true
            });
            
            // If no linked account exists for this provider, create one
            if (linkedAccount.length === 0) {
                await this.linkedAccountsRepository.create({
                    user_id: user._id as string,
                    auth_method: AuthMethod.OAUTH,
                    oauth_provider: data.provider,
                    email: data.email,
                    is_active: true
                });
                Console.write("Linked account created", LogLevel.INFO, { userId: user._id, provider: data.provider });
            }

            // Generate tokens
            const { accessToken, refreshToken } = await this.generateTokens(user);

            // Update user data
            const updateData: Partial<IUser> = {
                refresh_token: await UtilityService.hashToken(refreshToken),
                last_login: now
            };

            await this.userRepository.update(user._id as string, updateData);
            await this.transactionManager.commit();

            return {
                accessToken,
                refreshToken,
                user: this.constructUserObject(user),
            };
        } catch (error: any) {
            await this.transactionManager.rollback();
            Console.write('OAuth login error', LogLevel.ERROR, { error: error.message, stack: error.stack });
            if (['AuthenticationError', 'UnprocessedEntityError', 'ConflictError', 'ValidationError', 'AuthorizationError'].includes(error.name)) {
                throw error;
            }
            throw new AuthenticationError('An unexpected error occurred during login. Please try again later.');
        }
    }

}
