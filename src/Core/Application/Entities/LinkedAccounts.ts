import { Column, CompositeIndex, ForeignKey, Index } from '../../../extensions/decorators';
import { ILinkedAccounts } from '../Interface/Entities/auth-and-user/ILinkedAcounts';
import { AuthMethod, OAuthProvider } from '../Interface/Entities/auth-and-user/IUser';
import { ValidationError } from '../Error/AppError';
import { TableNames } from '../Enums/TableNames';

@CompositeIndex(['user_id', 'auth_method'])
export class LinkedAccounts implements ILinkedAccounts {
    @Column('UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    public _id?: string;

    @Index({ unique: false })
    @Column('UUID NOT NULL')
    @ForeignKey({ 
        table: `${TableNames.USERS}`, 
        field: '_id',
        constraint: 'fk_linked_accounts_user_id'
    })
    public user_id: string;

    @Column('VARCHAR(50) NOT NULL')
    public auth_method: AuthMethod | string;

    @Column('VARCHAR(50)')
    public oauth_provider?: OAuthProvider;

    @Index({ unique: false })
    @Column('VARCHAR(255) DEFAULT NULL')
    public oauth_id?: string;

    @Index({ unique: false })
    @Column('VARCHAR(255) DEFAULT NULL')
    public email?: string;

    @Index({ unique: false })
    @Column('BOOLEAN DEFAULT true')
    public is_active: boolean;

    @Index({ unique: false })
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    public created_at: Date;

    @Index({ unique: false })
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    public updated_at: Date;

    private constructor(data: Partial<ILinkedAccounts>) {
        Object.assign(this, data);
    }

    static create(data: Partial<ILinkedAccounts>): LinkedAccounts {
        const linkedAccount = new LinkedAccounts(data);
        linkedAccount.validate();
        return linkedAccount;
    }

    private validate(): void {
        if (!this.user_id) {
            throw new ValidationError('user_id is required');
        }

        if (!this.auth_method) {
            throw new ValidationError('auth_method is required');
        }

        if (this.auth_method === AuthMethod.OAUTH) {
            if (!this.oauth_provider) {
                throw new ValidationError('oauth_provider is required for OAuth authentication');
            }
            if (!this.oauth_id) {
                throw new ValidationError('oauth_id is required for OAuth authentication');
            }
        }

        // Validate auth_method is a valid enum value
        if (!Object.values(AuthMethod).includes(this.auth_method as AuthMethod)) {
            throw new ValidationError('Invalid auth_method');
        }

        // Validate oauth_provider if present
        if (this.oauth_provider && !Object.values(OAuthProvider).includes(this.oauth_provider)) {
            throw new ValidationError('Invalid oauth_provider');
        }
    }

    public toJSON(): ILinkedAccounts {
        return {
            user_id: this.user_id,
            auth_method: this.auth_method,
            oauth_provider: this.oauth_provider,
            oauth_id: this.oauth_id,
            email: this.email,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}
