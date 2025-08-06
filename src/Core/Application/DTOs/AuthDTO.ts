import { UserRole } from '../Enums/UserRole';
import { LoginType } from '../Enums/LoginType';
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
  IsDate,
  IsObject
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

@Expose()
export class LoginDTO {
    @Expose()
    @IsNotEmpty({ message: 'Identifier is required' })
    @IsString({ message: 'Identifier must be a string' })
    identifier: string;

    @Expose()
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    password: string;

    @Expose()
    @IsNotEmpty({ message: 'Login type is required' })
    @IsString({ message: 'Login type must be a string' })
    loginType: LoginType;
}

// @Expose()
@Expose()
export class VerifyEmailDTO {
    @Expose()
    @IsNotEmpty({ message: 'Email is required' })
    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Email must be a valid email address' })
    email: string;

    @Expose()
    @IsNotEmpty({ message: 'Verification code is required' })
    @IsString({ message: 'Verification code must be a string' })
    @Length(4, 4, { message: 'Verification code must be 4 digits' })
    @Matches(/^\d{4}$/, { message: 'Verification code must contain only digits' })
    code: string;

    @Expose()
    @IsNotEmpty({ message: 'Reference is required' })
    @IsString({ message: 'Reference must be a string' })
    reference: string;
}

@Expose()
export class EmailSignUpDTO {
    @Expose()
    @IsNotEmpty({ message: 'Email is required' })
    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Email must be a valid email address' })
    email: string;
}

@Expose()
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
export class EmailLoginDTO {
    @Expose()
    @IsNotEmpty({ message: 'Email is required' })
    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Email must be a valid email address' })
    email: string;

    @Expose()
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    @Length(8, 255, { message: 'Password must be between 8 and 255 characters long' })
    password: string;
}

export class PhoneLoginDTO {
    @Expose()
    @IsNotEmpty({ message: 'Phone number is required' })
    @IsString({ message: 'Phone number must be a string' })
    @IsPhoneNumber('US', { message: 'Phone number must be a valid US phone number' })
    // @IsPhoneNumber('NG', { message: 'Phone number must be a valid Nigerian phone number' })
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
    @IsString({ message: 'Country code must be a string' })
    @Matches(/^\+\d{1,4}$/, { 
        message: 'Country code must start with a plus (+) symbol followed by 1-4 digits' 
    })
    @IsNotEmpty({ message: 'Country code is required' })
    country_code: string;
    
    @Expose()
    @IsNotEmpty({ message: 'Phone is required' })
    @IsString({ message: 'Phone must be a string' })
    @Matches(/^\d{1,14}$/, { 
      message: 'Phone number must contain only digits and be 1-14 characters long' 
  })
    international_phone?: string;

    @Expose()
    @IsNotEmpty({ message: 'Gender is required' })
    @IsString({ message: 'Gender must be a string' })
    @Length(1, 1, { message: 'Gender must be a single character' })
    gender: string;

    @Expose()
    @IsOptional()
    @IsNotEmpty({ message: 'Date of birth is required' })
    // @IsString({ message: 'Date of birth must be a string' })
    @IsDate({ message: 'Date of birth must be a valid date' })
    dob?: Date;

    @Expose()
    @IsOptional()
    @IsNotEmpty({ message: 'Address is required' })
    @IsObject({ message: 'Address must be an object' })
    address?: ILocation;

    @Expose()
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    @Length(8, 255, { message: 'Password must be between 8 and 255 characters long' })
    password: string;

    image?: Express.Multer.File; //multer file

    // @Expose()
    // @IsOptional()
    // @IsNotEmpty({ message: 'Password is required' })
    // @IsString({ message: 'Password must be a string' })
    // @Length(8, 255, { message: 'Password must be between 8 and 255 characters long' })
    // password?: string;
}

@Expose()
export class RefreshTokenDTO {
    @Expose()
    @IsNotEmpty({ message: 'Refresh token is required' })
    @IsString({ message: 'Refresh token must be a string' })
    refresh_token: string;
}

@Expose()
export class EmailSetupPasswordDTO {
    @Expose()
    @IsNotEmpty({ message: 'Email is required' })
    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Email must be a valid email address' })
    email: string;

    @Expose()
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    @Length(8, 255, { message: 'Password must be between 8 and 255 characters long' })
    password: string;

    @Expose()
    @IsNotEmpty({ message: 'Verification reference is required' })
    @IsString({ message: 'Verification reference must be a string' })
    reference: string;
}

export class SetupPasswordDTO {
    @Expose()
    @IsNotEmpty({ message: 'Phone number is required' })
    @IsString({ message: 'Phone number must be a string' })
    @IsPhoneNumber('US', { message: 'Phone number must be a valid US phone number' })
    // @IsPhoneNumber('NG', { message: 'Phone number must be a valid Nigerian phone number' })
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

export interface IPhoneVerificationResponse {
  reference: string;
  expiry: number;
  phone?: string;
}

export interface IEmailVerificationResponse { 
  reference: string;
  expiry: number;
  email?: string;
}
