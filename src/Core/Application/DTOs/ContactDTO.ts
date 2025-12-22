import { IsEmail, IsString, IsNotEmpty, IsBoolean, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class ContactUsDTO {
    @IsString()
    @IsNotEmpty({ message: 'Full name is required' })
    @MinLength(2, { message: 'Full name must be at least 2 characters' })
    @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
    full_name!: string;

    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email!: string;

    @IsString()
    @IsNotEmpty({ message: 'Phone number is required' })
    @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
    phone_number!: string;

    @IsString()
    @IsNotEmpty({ message: 'Country is required' })
    @MinLength(2, { message: 'Country must be at least 2 characters' })
    country!: string;

    @IsString()
    @IsOptional()
    @MaxLength(100, { message: 'Organization name must not exceed 100 characters' })
    organization?: string;

    @IsString()
    @IsNotEmpty({ message: 'Subject is required' })
    @MinLength(5, { message: 'Subject must be at least 5 characters' })
    @MaxLength(200, { message: 'Subject must not exceed 200 characters' })
    subject!: string;

    @IsString()
    @IsNotEmpty({ message: 'Message is required' })
    @MinLength(20, { message: 'Message must be at least 20 characters' })
    @MaxLength(2000, { message: 'Message must not exceed 2000 characters' })
    message!: string;

    @IsBoolean()
    @IsOptional()
    subscribe_to_newsletter?: boolean = false;
}

export class NewsletterSubscriptionDTO {
    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email!: string;

    @IsString()
    @IsOptional()
    @MinLength(2, { message: 'Full name must be at least 2 characters' })
    @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
    full_name?: string;

    @IsString()
    @IsOptional()
    source?: string = 'direct';
}

export class UnsubscribeNewsletterDTO {
    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email!: string;

    @IsString()
    @IsOptional()
    token?: string;
}

export class ContactMessageResponseDTO {
    id: string;
    full_name: string;
    email: string;
    subject: string;
    status: string;
    created_at: string;
}

export class NewsletterSubscriptionResponseDTO {
    id: string;
    email: string;
    status: string;
    subscribed_at: string;
}

export class SubmitContactMessageDTO {
    full_name: string;
    email: string;
    phone_number: string;
    country: string;
    organization?: string;
    subject: string;
    message: string;
    subscribe_to_newsletter: boolean;
}

export class ContactMetadataDTO {
    ip_address?: string;
    user_agent?: string;
}

export class ContactSubmissionResultDTO {
    contact_message: ContactMessageResponseDTO;
    newsletter_subscription?: NewsletterSubscriptionResponseDTO;
}

export class PaginatedContactMessagesDTO {
    messages: ContactMessageResponseDTO[];
    total: number;
    page: number;
    total_pages: number;
}

export class PaginatedNewsletterSubscribersDTO {
    subscribers: NewsletterSubscriptionResponseDTO[];
    total: number;
    page: number;
    total_pages: number;
}

export class ContactMessageFiltersDTO {
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
}

export class NewsletterFiltersDTO {
    status?: string;
    page?: number;
    limit?: number;
}

export class UnsubscribeResultDTO {
    success: boolean;
    message: string;
}
