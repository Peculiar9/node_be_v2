import { inject, injectable } from 'inversify';
import { TYPES } from '@Core/Types/Constants';
import { IHttpClient } from '@Core/Application/Interface/Infrastructure/IHttpClient';
import { HttpClientFactory, ApiConfig } from '../Http/HttpClientFactory';

@injectable()
export abstract class BaseApiService {
    protected readonly httpClient: IHttpClient;
    protected readonly httpClientFactory: HttpClientFactory;

    constructor(
        @inject(TYPES.HttpClientFactory) httpClientFactory: HttpClientFactory,
        baseURL: string,
        config?: Partial<ApiConfig>
    ) {
        this.httpClientFactory = httpClientFactory;
        this.httpClient = httpClientFactory.createClient({
            baseURL,
            ...config
        });
    }

    protected createAuthenticatedClient(token: string): IHttpClient {
        return this.httpClientFactory.createAuthenticatedClient(
            { baseURL: process.env.API_BASE_URL! },
            token
        );
    }

    protected createServiceClient(serviceName: string): IHttpClient {
        return this.httpClientFactory.createServiceClient(serviceName);
    }
}
