export interface IContactMessage {
    _id?: string | null | undefined;
    full_name: string;
    email: string;
    phone_number: string;
    country: string;
    organization?: string;
    subject: string;
    message: string;
    subscribe_to_newsletter: boolean;
    status: ContactMessageStatus;
    replied_at?: string;
    replied_by?: string;
    reply_message?: string;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
    updated_at: string;
    __v?: number | null | undefined;
}

export enum ContactMessageStatus {
    NEW = 'new',
    IN_PROGRESS = 'in_progress',
    REPLIED = 'replied',
    RESOLVED = 'resolved',
    SPAM = 'spam'
}

export interface INewsletterSubscription {
    _id?: string | null | undefined;
    email: string;
    full_name?: string;
    status: NewsletterStatus;
    source: string; // 'contact_form', 'footer', 'popup', etc.
    subscribed_at: string;
    unsubscribed_at?: string;
    confirmed_at?: string;
    confirmation_token?: string;
    ip_address?: string;
    created_at: string;
    updated_at: string;
    __v?: number | null | undefined;
}

export enum NewsletterStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    UNSUBSCRIBED = 'unsubscribed',
    BOUNCED = 'bounced'
}
