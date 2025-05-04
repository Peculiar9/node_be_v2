import { UserRole } from '../Enums/UserRole';
import { ILocation, IUser } from '../Interface/Entities/auth-and-user/IUser';
import { UserResponseDTO } from './UserDTO';
import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  Length, 
  Matches, 
  IsPhoneNumber,
  IsOptional,
  IsDate
} from 'class-validator';
import { Expose } from 'class-transformer';

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
          email: result.email || undefined,
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


// @Expose()
export class PhoneSignUpDTO {
    @Expose()
    @IsNotEmpty({ message: 'Phone number is required' })
    @IsString({ message: 'Phone number must be a string' })
    @Matches(/^\d{1,14}$/, { 
        message: 'Phone number must contain only digits and be 1-14 characters long' 
    })
    international_phone: string;

    @Expose()
    @IsNotEmpty({ message: 'Country code is required' })
    @IsString({ message: 'Country code must be a string' })
    @Matches(/^\+\d{1,4}$/, { 
        message: 'Country code must start with a plus (+) symbol followed by 1-4 digits' 
    })
    country_code: string;
}

@Expose()
export class PhoneLoginDTO {
    @Expose()
    @IsNotEmpty({ message: 'Phone number is required' })
    @IsString({ message: 'Phone number must be a string' })
    // @IsPhoneNumber('US', { message: 'Phone number must be a valid US phone number' })
    @IsPhoneNumber('NG', { message: 'Phone number must be a valid Nigerian phone number' })
    international_phone: string;

    @Expose()
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    @Length(8, 255, { message: 'Password must be between 8 and 255 characters long' })
    password: string;
}

@Expose()
export class VerifyOTPDTO {
   
    @Expose()
    @IsString({ message: 'Country code must be a string' })
    @Matches(/^\+\d{1,4}$/, { 
        message: 'Country code must start with a plus (+) symbol followed by 1-4 digits' 
    })
    @IsNotEmpty({ message: 'Country code is required' })
    country_code: string;

    @Expose()
    @IsNotEmpty({ message: 'Phone number is required' })
    @IsString({ message: 'Phone number must be a string' })
    @Matches(/^\d{1,14}$/, { 
        message: 'Phone number must contain only digits and be 1-14 characters long' 
    })
    international_phone: string;
    
    @Expose()
    @IsNotEmpty({ message: 'Verification code is required' })
    @IsString({ message: 'Verification code must be a string' })
    @Length(4, 4, { message: 'Verification code must be 4 characters long' })
    code: string;

    @Expose()
    @IsNotEmpty({ message: 'Verification ID is required' })
    @IsString({ message: 'Verification ID must be a string' })
    token: string;
}

@Expose()
export class RegisterUserDTO {
    // @Expose()
    // @IsNotEmpty({ message: 'Phone number is required' })
    // @IsString({ message: 'Phone number must be a string' })
    // @IsPhoneNumber('US', { message: 'Phone number must be a valid Nigerian phone number' })
    // international_phone: string;

    @Expose()
    @IsNotEmpty({ message: 'Full name is required' })
    @IsString({ message: 'Full name must be a string' })
    full_name: string;

    @Expose()
    @IsNotEmpty({ message: 'Email is required' })
    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Email must be a valid email address' })
    email: string;

    @Expose()
    @IsOptional()
    @IsNotEmpty({ message: 'Date of birth is required' })
    @IsString({ message: 'Date of birth must be a string' })
    @IsDate({ message: 'Date of birth must be a valid date' })
    dob?: string;

    @Expose()
    @IsNotEmpty({ message: 'Address is required' })
    @IsString({ message: 'Address must be a string' })
    address: string;

    @Expose()
    @IsOptional()
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    @Length(8, 255, { message: 'Password must be between 8 and 255 characters long' })
    password?: string;
}

@Expose()
export class RefreshTokenDTO {
    @Expose()
    @IsNotEmpty({ message: 'Refresh token is required' })
    @IsString({ message: 'Refresh token must be a string' })
    refresh_token: string;
}

@Expose()
export class SetupPasswordDTO {
    @Expose()
    @IsNotEmpty({ message: 'Phone number is required' })
    @IsString({ message: 'Phone number must be a string' })
    // @IsPhoneNumber('US', { message: 'Phone number must be a valid US phone number' })
    @IsPhoneNumber('NG', { message: 'Phone number must be a valid Nigerian phone number' })
    international_phone: string;

    @Expose()
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    @Length(8, 255, { message: 'Password must be between 8 and 255 characters long' })
    password: string;

    @Expose()
    @IsNotEmpty({ message: 'Verification token is required' })
    @IsString({ message: 'Verification token must be a string' })
    token: string;
}