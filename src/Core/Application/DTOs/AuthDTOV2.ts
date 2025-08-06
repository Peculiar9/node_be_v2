import { IsNotEmpty, IsString, IsEmail, Length, IsEnum } from "class-validator";
import { UserRole } from "../Enums/UserRole";

export class RegisterUserDTOV2 {
    @IsNotEmpty({ message: 'First name is required' })
    @IsString({ message: 'First name must be a string' })
    first_name: string;

    @IsNotEmpty({ message: 'Last name is required' })
    @IsString({ message: 'Last name must be a string' })
    last_name: string;

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
}

export class LoginUserDTOV2 {
    @IsNotEmpty({ message: 'Email is required' })
    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Email must be a valid email address' })
    email: string;

    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    @Length(8, 255, { message: 'Password must be between 8 and 255 characters long' })
    password: string;
}
    