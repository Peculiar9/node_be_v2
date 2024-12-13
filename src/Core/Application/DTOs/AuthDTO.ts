import { UserRole } from '../Enums/UserRole';
import { IUser } from '../Interface/Entities/auth-and-user/IUser';
import { UserResponseDTO } from './UserDTO';

export interface LoginResponseDTO {
    accessToken: string;
    refreshToken: string;
    user: Partial<UserResponseDTO>;
}
export interface UserCreateResponseDTO {
    user: Partial<UserResponseDTO>;
  }
  
  // Utility function instead of static method
  export function createUserCreateResponseDTO(
    result: IUser
  ): UserCreateResponseDTO | undefined {
    try {
        console.log({result})
      return {
        user: {
          id: result._id || '',
          first_name: result.first_name,
          last_name: result.last_name,
          email: result.email,
          profile_image: result.profile_image || undefined,
          roles: result.roles as UserRole[],
          status: result.status,
          is_active: result.is_active,
          created_at: result.created_at 
            ? new Date(result.created_at).toISOString() 
            : new Date().toISOString(),
          updated_at: result.updated_at 
            ? new Date(result.updated_at).toISOString() 
            : new Date().toISOString()
        }
      };
    } catch (error: any) {
      console.error('Error creating UserCreateResponseDTO:', {
        message: error.message,
        stack: error.stack
      });
      return undefined;
    }
  }