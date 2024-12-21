// User entity interface definition

import { UserRole } from "@/Core/Application/Enums/UserRole";

export interface IUser{
    _id?: string | null | undefined;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    profile_image: string | null | undefined;
    status: string;
    is_active: boolean;
    email_verified: boolean;
    user_secret: string | null | undefined;
    salt: string | null | undefined;
    refresh_token: string | null | undefined;
    reset_token: string | null | undefined;
    last_login: string | null | undefined;
    roles: string[] | UserRole[];
    created_at: string;
    updated_at: string;
    __v: number;
}