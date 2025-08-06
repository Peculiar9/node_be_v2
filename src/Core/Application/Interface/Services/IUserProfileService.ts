import { UserResponseDTO, UpdateUserDTO } from '../../DTOs/UserDTO';
import { IUser } from '../Entities/auth-and-user/IUser';

/**
 * Interface for user profile-related operations
 * Responsible for managing user profile data, including updates and profile images
 */
export interface IUserProfileService {
    /**
     * Updates a user's profile information
     * @param userId User ID
     * @param dto Update data
     * @param existingUser Existing user object
     * @returns Updated user data
     */
    updateUser(userId: string, dto: UpdateUserDTO, existingUser: IUser): Promise<UserResponseDTO | undefined>;
    
    /**
     * Gets a user from their token
     * @param userId User ID
     * @returns User data
     */
    getUserFromToken(userId: string): Promise<UserResponseDTO | undefined>;
    
    /**
     * Updates a user's profile image
     * @param image Image file
     * @param user User object
     * @returns Updated user data
     */
    updateProfileImage(image: Express.Multer.File, user: IUser): Promise<UserResponseDTO>;
    
    /**
     * Removes a user
     * @param email User's email
     * @returns Removed user data
     */
    removeUser(email: string): Promise<UserResponseDTO | undefined>;
}
