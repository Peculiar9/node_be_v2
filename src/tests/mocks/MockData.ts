import { UserRole } from '../../Core/Application/Enums/UserRole';
import { CreateUserDTO, UpdateUserDTO, UserResponseDTO } from '../../Core/Application/DTOs/UserDTO';
import { UtilityService } from '@/Core/Services/UtilityService';

export const mockUserData = {
    createUserDTO: {
        email: 'test@example.com',
        password: 'Password123!',
        first_name: 'Test',
        last_name: 'User',
        roles: [UserRole.ADMIN]  // Use enum instead of string
    } as CreateUserDTO,

    userResponseDTO: {
        id: '6b40d27e-47f4-47dd-8ea9-f579dc49e325',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        roles: [UserRole.ADMIN],  // Use enum instead of string
        created_at: '2024-12-21T03:56:14.466Z',
        updated_at: '2024-12-21T03:56:14.466Z'
    } as UserResponseDTO,

    loginResponse: {
        user: {
            id: '6b40d27e-47f4-47dd-8ea9-f579dc49e325',
            email: 'test@example.com',
            roles: [UserRole.ADMIN]  // Use enum instead of string
        },
        token: 'mock-jwt-token'
    }
};
