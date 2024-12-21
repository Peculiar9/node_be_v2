import { injectable } from 'inversify';
import { AxiosHttpClient } from './AxiosHttpClient';
import { IHttpClient } from '../../Core/Application/Interface/Infrastructure/IHttpClient';

@injectable()
export class HttpClientFactory {
    createClient(baseURL?: string): IHttpClient {
        return new AxiosHttpClient(baseURL);
    }

    createAuthenticatedClient(baseURL: string, token: string): IHttpClient {
        return new AxiosHttpClient(baseURL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
    }
}
