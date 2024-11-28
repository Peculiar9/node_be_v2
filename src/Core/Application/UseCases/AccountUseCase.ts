import { inject, injectable } from 'inversify';
import { TYPES } from '../../Types/Constants';
import { IAccountUseCase } from '../Interface/UseCases/IAccountUseCase';
import { IAuthService } from '../Interface/Services/IAuthService';
import { LoginResponseDTO } from '../DTOs/AuthDTO';
import { ValidationError } from '../Error/AppError';
import { CreateUserDTO, UserResponseDTO, UpdateUserDTO } from '../DTOs/UserDTO';

@injectable()
export class AccountUseCase implements IAccountUseCase {
    constructor(
        @inject(TYPES.AuthService) private authService: IAuthService
    ) {}
    getAllUsers(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    createAdmin(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    register(dto: CreateUserDTO): Promise<UserResponseDTO> {
        throw new Error('Method not implemented.');
    }
    login(email: string, password: string): Promise<any> {
            // Validate inputs
        if (!email || !password) {
            throw new ValidationError('Email and password are required');
        }

        // Delegate authentication to AuthService
        return this.authService.authenticate(email, password);
    }
    
    updateProfile(userId: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
        throw new Error('Method not implemented.');
    }
    getUserProfile(userId: string): Promise<UserResponseDTO> {
        throw new Error('Method not implemented.');
    }
    verifyEmail(token: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    
    requestPasswordReset(email: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    resetPassword(token: string, newPassword: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    refreshToken(userId: string): Promise<{ token: string; }> {
        throw new Error('Method not implemented.');
    }
    logout(userId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Handles user login with validation
     */
    // async login(email: string, password: string): Promise<LoginResponseDTO> {
    //     // Validate inputs
    //     if (!email || !password) {
    //         throw new ValidationError('Email and password are required');
    //     }

    //     // Delegate authentication to AuthService
    //     return this.authService.authenticate(email, password);
    // }

}