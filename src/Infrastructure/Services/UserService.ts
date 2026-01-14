import { inject, injectable } from 'inversify';
import { TYPES } from '@Core/Types/Constants';
import { BaseApiService } from '../API/BaseApiService';
import { HttpClientFactory } from '../Http/HttpClientFactory';
import { UserResponseDTO } from '@Core/Application/DTOs/UserDTO';
import { IUser } from '@Core/Application/Interface/Entities/auth-and-user/IUser';
import { UserRepository } from '../Repository/SQL/users/UserRepository';
import { UserRole } from '@Core/Application/Enums/UserRole';

@injectable()
export class UserService extends BaseApiService {
    constructor(
        @inject(TYPES.HttpClientFactory) httpClientFactory: HttpClientFactory,
        @inject(TYPES.UserRepository) private userRepository: UserRepository
    ) {
        super(httpClientFactory, process.env.API_BASE_URL!);
    }

    async getAllUsers(): Promise<UserResponseDTO[]> {
        const users = await this.userRepository.findAll();
        return users.map((user: IUser) => this.constructUserObject(user));
    }

    // Method for making authenticated API calls to external services
    async makeExternalApiCall(token: string) {
        const authenticatedClient = this.createAuthenticatedClient(token);
        return await authenticatedClient.get('/some-external-endpoint');
    }

    private constructUserObject(user: IUser): UserResponseDTO {
        return {
            id: user._id as string,
            first_name: user.first_name as string,
            last_name: user.last_name as string,
            email: user.email as string,
            phone: user.phone as string,
            profile_image: user.profile_image as string,
            roles: user.roles as UserRole[],
            status: user.status as string,
            is_active: user.is_active,
            created_at: user.created_at as string,
            updated_at: user.updated_at as string,
        };
    }
}


