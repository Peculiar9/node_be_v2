import { AuthMethod, OAuthProvider } from "./IUser";

export interface ILinkedAccounts {
    _id?: string;
    user_id: string;
    auth_method: AuthMethod | string; // Extendable enum for clarity
    oauth_provider?: OAuthProvider | string; // Optional based on auth_method
    oauth_id?: string; // Optional for non-oauth methods.
    email?: string;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
  }

  
