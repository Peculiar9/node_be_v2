import { inject, injectable } from "inversify";
import { TYPES } from "../../Core/Types/Constants";
import { IRegistrationService } from "../../Core/Application/Interface/Services/IRegistrationService";
import { UserResponseDTO } from "../../Core/Application/DTOs/UserDTO";
import { VerifyEmailDTO, LoginResponseDTO } from "../../Core/Application/DTOs/AuthDTO";
import { UserRepository } from "../Repository/SQL/users/UserRepository";
import { VerificationRepository } from "../Repository/SQL/auth/VerificationRepository";
import { TransactionManager } from "../Repository/SQL/Abstractions/TransactionManager";
import { Console } from "../Utils/Console";
import { AppError, ValidationError, UnprocessableEntityError, ConflictError, AuthenticationError, InternalServerError } from "../../Core/Application/Error/AppError";
import { ResponseMessage } from '../../Core/Application/Response/ResponseFormat';
import { EnvironmentConfig } from '../Config/EnvironmentConfig';
import { CryptoService } from "../../Core/Services/CryptoService";
import { UtilityService } from "../../Core/Services/UtilityService";
import { IUser, VerificationStatus } from "../../Core/Application/Interface/Entities/auth-and-user/IUser";
import { VerificationType } from "../../Core/Application/Interface/Entities/auth-and-user/IVerification";
import { User } from "../../Core/Application/Entities/User";
import { UserStatus } from "../../Core/Application/Enums/UserStatus";
import { SMSService } from "./SMSService";
import { BaseService } from "./base/BaseService";
import { AuthHelpers } from "./helpers/AuthHelpers";
import { ITokenService } from "../../Core/Application/Interface/Services/ITokenService";
import { UserRegistrationDTO } from "../../Core/Application/DTOs/AuthDTOV2";
import { ITwilioEmailService } from "@/Core/Application/Interface/Services/ITwilioEmailService";

@injectable()
export class RegistrationService extends BaseService implements IRegistrationService {

    constructor(
        @inject(TYPES.UserRepository) private readonly userRepository: UserRepository,
        @inject(TYPES.VerificationRepository) private readonly verificationRepository: VerificationRepository,
        @inject(TYPES.TransactionManager) protected readonly transactionManager: TransactionManager,
        @inject(TYPES.AuthHelpers) private readonly authHelpers: AuthHelpers,
        @inject(TYPES.TokenService) private readonly tokenService: ITokenService,
        @inject(TYPES.TwilioEmailService) private readonly twilioEmailService: ITwilioEmailService,
        @inject(TYPES.SMSService) private readonly smsService: SMSService
    ) {
        super(transactionManager);
    }

    /**
     * @inheritdoc
     */
    async verifyEmailCode(data: VerifyEmailDTO): Promise<LoginResponseDTO> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            const verification = await this.verificationRepository.findByReference(data.reference);

            if (!verification || verification.type !== VerificationType.EMAIL || verification.identifier !== data.email) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            if (verification.status === VerificationStatus.COMPLETED) {
                throw new UnprocessableEntityError(ResponseMessage.EMAIL_VERIFICATION_ALREADY_COMPLETED);
            }

            if (this.authHelpers.isVerificationExpired(verification.expiry!)) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            if (this.authHelpers.isVerificationExpired(verification.otp.expiry!)) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION_CODE);
            }

            if (verification.attempts >= 3) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }

            const user = await this.userRepository.findById(verification.user_id!);
            if (!user) throw new ValidationError(ResponseMessage.USER_NOT_FOUND_MESSAGE);

            if (!EnvironmentConfig.isProduction() && data.code === '1234') {
            } else {
                const hashedCode = await CryptoService.hashString(data.code, user.salt as string);
                if (hashedCode !== verification.otp.code) {
                    await this.verificationRepository.incrementAttempts(data.reference);
                    throw new ValidationError(ResponseMessage.INVALID_VERIFICATION_CODE);
                }
            }

            await this.verificationRepository.update(verification._id as string, {
                status: VerificationStatus.COMPLETED,
                otp: {
                    ...verification.otp,
                    verified: true,
                    last_attempt: UtilityService.dateToUnix(new Date())
                }
            });

            const updatedUser = await this.userRepository.update(user._id!, {
                status: UserStatus.ACTIVE,
                email_verified: true
            }) as IUser;

            const { accessToken, refreshToken } = await this.tokenService.generateTokens(updatedUser);

            await this.commitTransaction();

            return { accessToken, refreshToken, user: this.authHelpers.constructUserObject(updatedUser) };
        } catch (error: any) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "email verification");
        }
    }

    /**
     * @inheritdoc
     */
    async resendVerification(identifier: string, reference: string): Promise<any> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            const verification = await this.verificationRepository.findByReference(reference);
            if (!verification || verification.identifier !== identifier) {
                throw new UnprocessableEntityError(ResponseMessage.INVALID_VERIFICATION);
            }
            if (verification.status === VerificationStatus.COMPLETED) {
                throw new ConflictError(ResponseMessage.VERIFICATION_ALREADY_COMPLETED);
            }

            const user = await this.userRepository.findById(verification.user_id!);
            if (!user) throw new UnprocessableEntityError(ResponseMessage.USER_NOT_FOUND_MESSAGE);

            const newOtpCode = UtilityService.generate4Digit();
            const hashedOtp = await CryptoService.hashString(newOtpCode, user.salt);

            verification.otp!.code = hashedOtp;
            verification.otp!.expiry = UtilityService.dateToUnix(Date.now() + 30 * 60 * 1000);
            verification.otp!.attempts = 0;

            await this.verificationRepository.update(verification._id!, { otp: verification.otp });

            await this.twilioEmailService.sendEmailVerification(
                identifier,
                user.first_name
            );

            await this.commitTransaction();
            return this.authHelpers.formatEmailVerificationResponse(verification);
        } catch (error) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "resend email verification");
        }
    }

    /**
     * @inheritdoc
     */
    async initRegistration(dto: UserRegistrationDTO): Promise<any> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            const existingUser = await this.userRepository.findByEmail(dto.email);
            if (existingUser) {
                throw new ValidationError("User with this email already exists");
            }

            const existingByPhone = await this.userRepository.findByPhone(dto.phone);
            if (existingByPhone) {
                throw new ValidationError("User with this phone already exists");
            }

            const userObject = await User.createFromRegisterUserDTO(dto) as IUser;
            if (!userObject) {
                throw new InternalServerError("Failed to create user object");
            }

            userObject.password = await CryptoService.hashString(dto.password, userObject.salt);;

            const user = await this.userRepository.create(userObject);
            if (!user || !user._id) {
                throw new InternalServerError("Failed to create user in database");
            }

            await this.commitTransaction();

            const { accessToken, refreshToken } = await this.tokenService.generateTokens(user);
            const response = this.authHelpers.constructUserObject(user);
            return { accessToken, refreshToken, user: response };
        } catch (error) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "init registration");
        }
    }

    /**
     * @inheritdoc
     */
    async createUser(dto: any): Promise<UserResponseDTO> {
        let transactionStarted = false;
        try {
            transactionStarted = await this.beginTransaction();

            if (dto.email) {
                const existingUser = await this.userRepository.findByEmail(dto.email);
                if (existingUser) throw new ConflictError("User with this email already exists");
            }

            const userObject = await User.createFromDTO(dto) as IUser;
            if (dto.password) {
                const salt = CryptoService.generateValidSalt();
                userObject.salt = salt;
                userObject.password = await CryptoService.hashString(dto.password, salt);
            }

            const user = await this.userRepository.create(userObject);

            await this.commitTransaction();
            return this.authHelpers.constructUserObject(user);
        } catch (error) {
            if (transactionStarted) await this.rollbackTransaction();
            this._handleRegistrationError(error, "create user");
        }
    }

    private _handleRegistrationError(error: any, context: string): never {
        Console.error(error, { message: `RegistrationService failed during ${context}`, context: 'RegistrationService' });
        if (error instanceof ValidationError || error instanceof UnprocessableEntityError || error instanceof AuthenticationError || error instanceof ConflictError) {
            throw error;
        }
        throw new AppError(`An unexpected error occurred during ${context}. Please try again later.`, 500);
    }
}
