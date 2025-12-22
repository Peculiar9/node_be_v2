// User entity interface definition

import { UserRole } from "../../../Enums/UserRole";

export interface IUser{
    _id?: string | null | undefined;
    first_name: string;
    last_name: string;
    email?: string | null | undefined;
    password: string;
    profile_image: string | null | undefined;
    status: string;
    is_active: boolean;
    email_verified: boolean;
    salt: string;
    user_secret: string | null | undefined;
    // salt field removed as bcrypt handles salt internally
    refresh_token: string | null | undefined;
    reset_token: string | null | undefined;
    reset_token_expires: number | null | undefined; // Unix timestamp
    last_login: string | null | undefined;
    roles: string[] | UserRole[];
    age: number;
    dob: Date | string;
    gender?: string;
    drivers_license: string;
    country_code: string;
    international_phone: string;
    phone?: string | null | undefined;
    trips_count: number;
    host_trip_count: number;
    location: ILocation;
    user_criteria?: string; //new, loyal, more like badges for users
    host_badges: string; // All-star e.t.c one has to determine which these would be and also, put them in an enum
    stripe_id: string;
    billing_info: IBillingInfo;
    hosted_cars: (string | null | undefined)[];
    favourite_cars: (string | null | undefined)[]; // ids of cars that the user considers their favourites
    favourite_hosts: (string | null | undefined)[]; // ids of hosts that the user considers their favourites
    card_tokens: (ICardToken | string | null | undefined)[];
    verification_progress: string;
    verification_level: number;
    host_verification_level?: number;
    // verification_id?: string | null | undefined;
    required_pid: boolean;
    required_poa: boolean;
    required_selfie: boolean;
    verified_selfie: boolean;
    verified_poa: boolean;
    verified_pid: boolean;
    //OAUTH
    auth_method: AuthMethod | string;
    
    created_at: string;
    updated_at: string;
    __v: number;
}

export interface OAuthUserData{
    name: string;
    id: string;
    photoUrl: string;
    email: string;
    phone: string;
    token: string;
    provider: OAuthProvider | string;
}


export interface LinkedAccount{
    _id?: string | null | undefined;
    user_id: string; //Foreign key to user
    auth_method: AuthMethod | string;
    oauth_provider: OAuthProvider | string;
    oauth_id: string;
    created_at: string;
    updated_at: string;
    __v: number;
}

export enum AuthMethod{
    OAUTH = 'oauth',
    PASSWORD = 'password',
    MAGIC_LINK = 'magic_link'
}

export enum OAuthProvider {
    GOOGLE = 'google',
    FACEBOOK = 'facebook',
    APPLE = 'apple'
}
export interface ICardToken {
    is_active: boolean; //the active and is not a dead card, usually prompt user to update card details
    token: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    is_default: boolean;
}

export interface IBillingInfo {
    street_address: string;
    city: string;
    region: string;
    zip_code: string;
    country: string;
}

export interface ILocation{
    type?: string;
    address?: string;
    country?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country_code?: string;
    longitude?: number;
    latitude?: number; 
}

export enum VerificationStatus{
    PENDING = 'pending', //when user has verified the email address
    VERIFIED = 'verified',//when user has done phone verification
    EXPIRED = 'expired',
    FAILED = 'failed',
    COMPLETED = 'completed'
}   

export enum UserPermission{
    
}