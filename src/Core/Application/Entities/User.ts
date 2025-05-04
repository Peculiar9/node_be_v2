import { IBillingInfo, ICardToken, ILocation, IUser } from '../Interface/Entities/auth-and-user/IUser';
import { CreateUserDTO, UpdateUserDTO } from '../DTOs/UserDTO';
import { InternalServerError, ValidationError } from '../Error/AppError';
import { UtilityService } from '../../Services/UtilityService';
import { UserRole } from '../Enums/UserRole';
import { Column, CompositeIndex, ForeignKey, Index } from '../../../extensions/decorators';
import { UserStatus } from '../Enums/UserStatus';


@CompositeIndex(['first_name', 'last_name'])
export class User implements IUser {
    @Column('UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    public _id?: string | null | undefined;

    @Column('VARCHAR(255) NOT NULL')
    public first_name: string;

    @Column('VARCHAR(255) NOT NULL')
    public last_name: string;

    @Index({ unique: true, type: 'BTREE' })
    @Column('VARCHAR(255) UNIQUE DEFAULT NULL')
    public email: string;

    @Column('VARCHAR(255) NOT NULL')
    public password: string;

    @Column('VARCHAR(255) DEFAULT NULL')
    public profile_image: string | null | undefined;

    @Column('VARCHAR(50) NOT NULL DEFAULT \'inactive\'')
    public status: string;

    @Column('BOOLEAN DEFAULT false')
    public is_active: boolean;

    @Column('TEXT DEFAULT NULL')
    public user_secret: string | null | undefined;

    @Column('VARCHAR(255) DEFAULT NULL')
    public salt: string | null | undefined;

    @Column('TEXT DEFAULT NULL')
    public refresh_token: string | null | undefined;

    @Column('BOOLEAN DEFAULT false')
    public email_verified: boolean;

    @Column('TEXT DEFAULT NULL')
    public reset_token: string | null | undefined;

    @Index({ unique: false })
    @Column('TIMESTAMP DEFAULT NULL')
    public last_login: string | null | undefined;

    @Column('TEXT[] DEFAULT ARRAY[]::TEXT[]')
    public roles: string[] | UserRole[] = [];

    @Column('INTEGER DEFAULT 0')
    public age: number;

    @Column('TIMESTAMP WITH TIME ZONE DEFAULT NULL')
    public dob: string | Date;

    @Column('VARCHAR(255) DEFAULT NULL')
    public gender?: string | undefined;

    @Column('VARCHAR(255) DEFAULT NULL')
    public drivers_license: string;

    @Column('VARCHAR(255) DEFAULT NULL')
    public country_code: string;

    @Column('VARCHAR(255) DEFAULT NULL')
    public international_phone: string;

    @Index({ unique: true })
    @Column('VARCHAR(255) UNIQUE DEFAULT NULL')
    public phone: string;

    @Column('INTEGER DEFAULT 0')
    public trips_count: number;

    @Column('INTEGER DEFAULT 0')
    public host_trip_count: number;

    @Column('JSONB DEFAULT NULL')
    public location: ILocation;

    @Column('VARCHAR(255) DEFAULT NULL')
    public user_criteria?: string | undefined;

    @Column('VARCHAR(255) DEFAULT NULL')
    public host_badges: string;

    @Column('VARCHAR(255) DEFAULT NULL')
    public stripe_id: string;

    @Column('JSONB DEFAULT NULL')
    public billing_info: IBillingInfo;

    @Column('TEXT[] DEFAULT ARRAY[]::TEXT[]')
    public hosted_cars: (string | null | undefined)[];

    @Column('TEXT[] DEFAULT ARRAY[]::TEXT[]')
    public favourite_cars: (string | null | undefined)[];

    @Column('TEXT[] DEFAULT ARRAY[]::TEXT[]')
    public favourite_hosts: (string | null | undefined)[];

    @Column('TEXT[] DEFAULT ARRAY[]::TEXT[]')
    public card_tokens: (ICardToken | string | null | undefined)[];

    @Column('VARCHAR(255) DEFAULT NULL')
    public verification_progress: string;

    @Column('INTEGER DEFAULT 0')
    public verification_level: number;

    @Column('INTEGER DEFAULT 0')
    public host_verification_level?: number | undefined;

    // @Index({ unique: false })
    // @ForeignKey({ table: 'verifications', field: '_id' }    )
    // @Column('VARCHAR(255) DEFAULT NULL')
    // public verification_id?: string | null | undefined;

    @Column('BOOLEAN DEFAULT false')
    public required_pid: boolean;

    @Column('BOOLEAN DEFAULT false')
    public required_poa: boolean;

    @Column('BOOLEAN DEFAULT false')
    public required_selfie: boolean;

    @Column('BOOLEAN DEFAULT false')
    public verified_selfie: boolean;

    @Column('BOOLEAN DEFAULT false')
    public verified_poa: boolean;

    @Column('BOOLEAN DEFAULT false')
    public verified_pid: boolean;

    @Column('VARCHAR(255)') 
    auth_method: string;

    @Column('VARCHAR(255)')
    oauth_provider: string;

    @Index({ unique: false })
    @Column('VARCHAR(255)')
    oauth_id: string;

    @Index({unique: false})
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    public created_at: string;

    @Index({unique: false})
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    public updated_at: string;

    @Column('INTEGER DEFAULT 0')
    public __v: number;

    private constructor(data: Partial<IUser>) {
        Object.assign(this, data);
    }
  
   

    static async createFromDTO(dto: CreateUserDTO): Promise<User | undefined> {
        try{
            const { hash: password, salt } = await UtilityService.generatePasswordHash(dto.password);
            let email;

            if(dto.email === '') {
                email = null;
            } else {
                email = dto.email.toLowerCase();
            }

            console.log("Email: ", {email});
            const user_secret = UtilityService.generateUserSecret();
            const userData: Partial<IUser> = {
                // _id: UtilityService.generateUUID(),
                first_name: dto.first_name,
                last_name: dto.last_name,
                email,
                password,
                salt,
                user_secret,
                profile_image: dto.profile_image || '',
                // status: UserStatus.INACTIVE,
                is_active: true,
                refresh_token: '',  // Initialize with empty string
                roles: dto.roles,
            };

            const user = new User(userData);
            user.validate();
            return user;
        }catch(error: any){
            console.error('User Object creation: ', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    static async createFromPhone(phoneNumber: string, salt: string): Promise<User | undefined> {
        try{
            const user_secret = UtilityService.generateUserSecret();
            if(!salt){
                throw new InternalServerError('Salt is required');
            }

            const userData: Partial<IUser> = {
                // _id: UtilityService.generateUUID(),
                first_name: '',
                last_name: '',
                email: null,
                phone: phoneNumber,
                password: '',
                country_code: '',
                international_phone: '',
                drivers_license: '',
                auth_method: '',
                salt,
                last_login: null,
                user_secret,
                profile_image: '',
                status: UserStatus.INACTIVE,
                is_active: true,
                refresh_token: '',  // Initialize with empty string
                roles: [UserRole.USER],
                __v: 0
            };

            const user = new User(userData);
            return user;
        }catch(error: any){
            console.error('User Object creation: ', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    static async createFromOAuth(dto: CreateUserDTO): Promise<User | undefined> {
        try{
            const user_secret = UtilityService.generateUserSecret();
            const userData: Partial<IUser> = {
                // _id: UtilityService.generateUUID(),
                first_name: dto.first_name,
                last_name: dto.last_name,
                email: dto.email,
                phone: dto.phone || '',
                password: '',
                user_secret,
                profile_image: dto.profile_image || '',
                status: UserStatus.ACTIVE,
                is_active: true,
                refresh_token: '',  // Initialize with empty string
                roles: [UserRole.USER],
                auth_method: 'oauth',
            };
            return new User(userData);
        }catch(error: any){
            console.error('User Object creation: ', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
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
        if (!this.isValidEmail(this.email as string)) {
            throw new ValidationError('Invalid email format');
        }

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