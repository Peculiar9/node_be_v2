import { IsNotEmpty, IsString, IsEmail, Length, IsEnum, Matches } from "class-validator";
import { UserRole } from "../Enums/UserRole";

export class UserRegistrationDTO {
    @IsNotEmpty({ message: 'Full name is required' })
    @IsString({ message: 'Full name must be a string' })
    full_name: string;

    @IsNotEmpty({ message: 'Email is required' })
    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Email must be a valid email address' })
    email: string;

    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    @Length(8, 255, { message: 'Password must be between 8 and 255 characters long' })
    password: string;

    @IsNotEmpty({ message: 'Role is required' })
    @IsEnum(UserRole, { message: 'Role must be a valid user role' })
    @IsString({ message: 'Role must be a string' })
    role: UserRole | string;

    @IsNotEmpty({ message: 'Phone is required' })
    @IsString({ message: 'Phone must be a string' })
    phone: string;

    @IsNotEmpty({ message: 'Country is required' })
    @IsString({ message: 'Country must be a string' })
    country: string;

    @IsNotEmpty({ message: 'City is required' })
    @IsString({ message: 'City must be a string' })
    city: string;
}