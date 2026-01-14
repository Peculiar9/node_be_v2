import { inject, injectable } from "inversify";
import { TYPES } from "@Core/Types/Constants";
import { BaseApiService } from "../../API/BaseApiService";
import { HttpClientFactory } from "../../Http/HttpClientFactory";
import { IGoogleService, GoogleTokenResponse, GoogleUserProfile } from "@Core/Application/Interface/Services/IGoogleService";
import { AuthorizationError } from "@Core/Application/Error/AppError";

@injectable()
export class GoogleService extends BaseApiService implements IGoogleService {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;

    constructor(
        @inject(TYPES.HttpClientFactory) httpClientFactory: HttpClientFactory,
        @inject(TYPES.GOOGLE_CLIENT_ID) clientId: string,
        @inject(TYPES.GOOGLE_CLIENT_SECRET) clientSecret: string,
        @inject(TYPES.GOOGLE_REDIRECT_URI) redirectUri: string
    ) {
        const config = {
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        super(httpClientFactory, 'https://oauth2.googleapis.com', config);

        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }


    async getAccessToken(code: string): Promise<GoogleTokenResponse> {
        try {
            const params = new URLSearchParams({
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code'
            });

            const response = await this.httpClient.post<GoogleTokenResponse>(
                '/token',
                params.toString()
            );

            return response;
        } catch (error: any) {
            console.error('GoogleService::getUserProfile(): ', {
                message: error.message,
                stack: error.stack
            });
            throw new AuthorizationError('Failed to get Google access token: ' + error.message);
        }
    }

    async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
        try {
            const response = await this.httpClient.get<GoogleUserProfile>(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            return response;
        } catch (error: any) {
            console.error('GoogleService::getUserProfile(): ', {
                message: error.message,
                stack: error.stack
            });
            throw new AuthorizationError('Failed to get Google user profile: ' + error.message);
        }
    }

    async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
        try {
            const params = new URLSearchParams({
                refresh_token: refreshToken,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'refresh_token'
            });

            const response = await this.httpClient.post<GoogleTokenResponse>(
                '/token',
                params.toString()
            );

            return response;
        } catch (error: any) {
            throw new AuthorizationError('Failed to refresh Google access token: ' + error.message);
        }
    }
}