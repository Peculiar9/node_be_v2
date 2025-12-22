import { UserRegistrationDTO } from "../../DTOs/AuthDTOV2";
import { VerifyEmailDTO, LoginResponseDTO } from "../../DTOs/AuthDTO";
import { UserResponseDTO } from "../../DTOs/UserDTO";

export interface IRegistrationService {
    initRegistration(dto: UserRegistrationDTO): Promise<any>;
    verifyEmailCode(dto: VerifyEmailDTO): Promise<LoginResponseDTO>;
    resendVerification(identifier: string, reference: string): Promise<any>;
    createUser(dto: any): Promise<UserResponseDTO>;
}
