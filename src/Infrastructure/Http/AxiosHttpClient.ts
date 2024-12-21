import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { injectable } from 'inversify';
import { IHttpClient } from '../../Core/Application/Interface/Infrastructure/IHttpClient';
import { HttpClientError } from '../../Core/Application/Error/AppError';

@injectable()
export class AxiosHttpClient implements IHttpClient {
    private readonly client: AxiosInstance;

    constructor(baseURL?: string, config?: AxiosRequestConfig) {
        this.client = axios.create({
            baseURL,
            ...config,
            headers: {
                'Content-Type': 'application/json',
                ...config?.headers,
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        this.client.interceptors.response.use(
            (response: AxiosResponse) => response.data,
            (error: any) => {
                throw HttpClientError.fromAxiosError(error);
            }
        );
    }

    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return await this.client.get<any, T>(url, config);
    }

    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return await this.client.post<any, T>(url, data, config);
    }

    async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return await this.client.put<any, T>(url, data, config);
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return await this.client.delete<any, T>(url, config);
    }

    async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return await this.client.patch<any, T>(url, data, config);
    }
}
