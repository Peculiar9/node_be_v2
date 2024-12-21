import { inject, injectable } from 'inversify';
import { TYPES } from '../../Core/Types/Constants';
import { IHttpClient } from '../../Core/Application/Interface/Infrastructure/IHttpClient';
import { HttpClientFactory } from '../Http/HttpClientFactory';

@injectable()
export abstract class BaseApiService {
    protected readonly httpClient: IHttpClient;

    constructor(
        @inject(TYPES.HttpClientFactory) httpClientFactory: HttpClientFactory,
        baseURL: string
    ) {
        this.httpClient = httpClientFactory.createClient(baseURL);
    }

    protected createAuthenticatedClient(token: string): IHttpClient {
        return new HttpClientFactory().createAuthenticatedClient(
            process.env.API_BASE_URL!,
            token
        );
    }
}
