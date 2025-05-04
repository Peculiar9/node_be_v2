export interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    token_type: string;
    id_token?: string;
}

export interface GoogleUserProfile {
    id: string;
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    email: string;
    email_verified: boolean;
    locale: string;
    hd: string;
}

export interface IGoogleService {
    getAccessToken(code: string): Promise<GoogleTokenResponse>;
    getUserProfile(accessToken: string): Promise<GoogleUserProfile>;
    refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse>;
}
