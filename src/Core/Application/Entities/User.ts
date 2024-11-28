import { IUser } from '../Interface/Entities/auth-and-user/IUser';
import { CreateUserDTO, UpdateUserDTO } from '../DTOs/UserDTO';
import { ValidationError } from '../Error/AppError';
import { UtilityService } from '@/Core/Services/UtilityService';
import { UserRole } from '../Enums/UserRole';

export class User implements IUser {
    public _id?: string | null | undefined;
    public first_name: string | null | undefined;
    public last_name: string | null | undefined;
    public email: string | null | undefined;
    public password: string | null | undefined;
    public profile_image: string | null | undefined;
    public status: string | null | undefined;
    public isActive: boolean;
    public user_secret: string | null | undefined;
    public salt: string | null | undefined;
    public refresh_token: string | null | undefined;
    public last_login: string | null | undefined;
    public roles: string[];
    public created_at: string | null | undefined;
    public updated_at: string | null | undefined;
    public __v: number;

    private constructor(data: Partial<IUser>) {
        Object.assign(this, data);
    }

    static async createFromDTO(dto: CreateUserDTO): Promise<User> {
        const { hash: password, salt } = await UtilityService.generatePasswordHash(dto.password);
        const user_secret = UtilityService.generateUserSecret();
        
        const userData: Partial<IUser> = {
            _id: UtilityService.generateUUID(),
            first_name: dto.first_name,
            last_name: dto.last_name,
            email: dto.email.toLowerCase(),
            password,
            salt,
            user_secret,
            profile_image: dto.profile_image || '',
            status: 'active',
            isActive: true,
            refresh_token: '',  // Initialize with empty string
            last_login: '',     // Initialize with empty string
            roles: dto.roles,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            __v: 0
        };

        const user = new User(userData);
        user.validate();
        return user;
    }

    static async updateFromDTO(existingUser: User, dto: UpdateUserDTO): Promise<User> {
        const updates: Partial<IUser> = { ...dto };
        
        if (dto.password) {
            const { hash: password, salt } = await UtilityService.generatePasswordHash(dto.password);
            updates.password = password;
            updates.salt = salt;
        }

        updates.updated_at = new Date().toISOString();
        
        const updatedUser = new User({ ...existingUser, ...updates });
        updatedUser.validate();
        return updatedUser;
    }

    private validate(): void {
        // Required fields validation
        const requiredFields: (keyof IUser)[] = [
            'email',
            'first_name',
            'last_name',
            'status',
            'roles'
        ];

        for (const field of requiredFields) {
            if (!this[field]) {
                throw new ValidationError(`${field.replace('_', ' ')} is required`);
            }
        }

        // Email validation
        if (!this.isValidEmail(this.email as string)) {
            throw new ValidationError('Invalid email format');
        }

        // Roles validation
        if (!this.roles?.length) {
            throw new ValidationError('At least one role is required');
        }
        this.validateRoles();

        // Status validation
        const validStatuses = ['active', 'inactive', 'pending'];
        if (!validStatuses.includes(this.status as string)) {
            throw new ValidationError('Invalid status');
        }

        // Date format validation
        const dateFields = ['created_at', 'updated_at', 'last_login'];
        for (const field of dateFields) {
          if (this[field as keyof User] && !this.isValidISODate(this[field as keyof User] as string)) {
                throw new ValidationError(`Invalid ${field.replace('_', ' ')} date format`);
            }
        }
    }

    private validateRoles(): void {
        const validRoles = Object.values(UserRole);
        const invalidRoles = this.roles.filter(role => !validRoles.includes(role as UserRole));
        if (invalidRoles.length > 0) {
            throw new ValidationError(`Invalid roles: ${invalidRoles.join(', ')}`);
        }
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private isValidISODate(dateString: string): boolean {
        if (!dateString) return true; // Allow empty strings
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime()) && date.toISOString() === dateString;
    }

    public getFullName(): string {
        return `${this.first_name} ${this.last_name}`;
    }

    public hasRole(role: UserRole): boolean {
        return this.roles.includes(role);
    }

    public updateLastLogin(): void {
        this.last_login = new Date().toISOString();
    }

    public setRefreshToken(token: string): void {
        this.refresh_token = token;
    }

    public toJSON(): Omit<IUser, 'password' | 'salt' | 'user_secret'> {
        const { password, salt, user_secret, ...rest } = this;
        return rest;
    }
}