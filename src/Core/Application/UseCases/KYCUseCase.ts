import { inject } from "inversify";
import { TYPES } from "../../../Core/Types/Constants";
import { IKYCUseCase } from "../Interface/UseCases/IKYCUseCase";
import { IUserKYC, KYCStage, KYCStatus } from "../Interface/Entities/auth-and-user/IVerification";
import { UserKYCRepository } from "../../../Infrastructure/Repository/SQL/auth/UserKYCRepository";
import { UserRepository } from "../../../Infrastructure/Repository/SQL/users/UserRepository";
import { RegistrationError } from "../Error/AppError";

export class KYCUseCase implements IKYCUseCase {
    constructor(@inject(TYPES.UserKYCRepository) private readonly userKYCRepository: UserKYCRepository, @inject(TYPES.UserRepository) private readonly userRepository: UserRepository) {}
    
    
    async checkOrInitializeKYC(userId: string): Promise<IUserKYC> {
        const userKYC = await this.userKYCRepository.findByUserId(userId);
        if (!userKYC) {
            const user = await this.userRepository.findById(userId);
                if (!user) {
                throw new RegistrationError("User not found");
            }
            

            const newUserKYC: Partial<IUserKYC> = {
                user_id: userId,
                status: KYCStatus.PENDING,
                current_stage: KYCStage.FACE_UPLOAD,
                stage_metadata: {},
            }
            return this.userKYCRepository.create(newUserKYC);
        }

        if(userKYC.status === KYCStatus.COMPLETED) {
            throw new RegistrationError("User already completed KYC, proceed to app");
        }
        return userKYC;
    }
    getFaceImageUploadUrls(userId: string): Promise<{ frontFace: { uploadUrl: string; key: string; }; sideFace: { uploadUrl: string; key: string; }; }> {
        throw new Error("Method not implemented.");
    }
    submitFaceImages(userId: string, frontFaceKey: string, sideFaceKey: string): Promise<IUserKYC> {
        throw new Error("Method not implemented.");
    }
    getLicenseUploadUrl(userId: string): Promise<{ uploadUrl: string; key: string; }> {
        throw new Error("Method not implemented.");
    }
    submitLicenseAndPerformVerifications(userId: string, licenseKey: string): Promise<IUserKYC> {
        throw new Error("Method not implemented.");
    }
    addPaymentMethod(userId: string, paymentToken: string): Promise<IUserKYC> {
        throw new Error("Method not implemented.");
    }
}