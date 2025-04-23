import { ValidationError } from '../Error/AppError';
import { Column, Index, ForeignKey } from '../../../extensions/decorators';
import { IVerification, VerificationType } from '../Interface/Entities/auth-and-user/IVerification';
import { VerificationStatus } from '../Interface/Entities/auth-and-user/IUser';
import { OTP } from '../Types/OTP';
import { UtilityService } from '../../Services/UtilityService';


export class Verification implements IVerification {

    @Column('UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    _id?: string;

    @Column('UUID DEFAULT NULL')
    @Index({ unique: false })
    @ForeignKey({ table: 'users', field: '_id' })
    user_id: string | undefined;

    @Column('UUID NOT NULL DEFAULT gen_random_uuid()')
    @Index({ unique: true })
    reference: string;

    @Index({ unique: false })
    @Column('JSONB NOT NULL DEFAULT \'{}\'')
    otp?: OTP;

    @Index({ unique: false })   
    @Column(`VARCHAR(255) NOT NULL DEFAULT \'${VerificationStatus.PENDING}\'`)
    status?: VerificationStatus;

    @Index({ unique: false })   
    @Column('VARCHAR(255) NOT NULL')
    identifier?: string; //phone

    @Index({ unique: false })   
    @Column(`VARCHAR(255) NOT NULL DEFAULT \'${VerificationType.PHONE}\'`)
    type?: VerificationType | string;

    @Index({ unique: false })   
    @Column('BIGINT NOT NULL')
    expiry?: number;

    @Index({ unique: false })
    @Column('TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP')
    created_at: string;

    @Index({ unique: false })
    @Column('TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
    updated_at: string;

    private constructor(partial: Partial<IVerification>) {
        Object.assign(this, partial);
    }
    
    static async createFromDTO(dto: any): Promise<Verification | undefined> {
        try {
            const data = {
                reference: dto.reference || UtilityService.generateUUID(),
                ...dto
            }
            const verification = new Verification(data);
            verification.validate();
            return verification;
        } catch (error: any) {
            console.error('Verification Object creation: ', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    validate(): void {
        // Implement validation logic here
        const requiredFields: (keyof IVerification)[] = [
            'reference',
            'status',
            'type',
            'expiry',
        ];

        for (const field of requiredFields) {
            if (!this[field]) {
                throw new ValidationError(`${field.replace('_', ' ')} is required`);
            }
        }

        if(!this.status || !['pending', 'verified', 'expired'].includes(this.status)) {
            throw new ValidationError('Invalid status');
        }

        if(this.expiry && typeof this.expiry !== 'number' || this.expiry as number <= 0) {
            const currentTime = Date.now();
            if (this.expiry as number < currentTime) {
                throw new ValidationError('Expiry date must be in the future');
            }
            throw new ValidationError('Invalid expiry');
        }

        if(this.otp && typeof this.otp !== 'object') {
            throw new ValidationError('Invalid OTP');
        }
    }
} 