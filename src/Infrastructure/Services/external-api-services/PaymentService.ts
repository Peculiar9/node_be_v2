import { injectable, inject } from 'inversify';
import { TYPES } from '../../../Core/Types/Constants';
import { BaseApiService } from '../../API/BaseApiService';
import { HttpClientFactory } from '../../Http/HttpClientFactory';

@injectable()
export class PaymentService extends BaseApiService {
    constructor(
        @inject(TYPES.HttpClientFactory) httpClientFactory: HttpClientFactory
    ) {
        super(httpClientFactory, process.env.PAYMENT_SERVICE_URL!, {
            timeout: 5000,
            headers: {
                'X-API-Key': process.env.PAYMENT_SERVICE_API_KEY!
            }
        });
    }

    async processPayment(paymentData: any) {
        return await this.httpClient.post('/payments', paymentData);
    }

    async getPaymentStatus(paymentId: string, token: string) {
        const authClient = this.createAuthenticatedClient(token);
        return await authClient.get(`/payments/${paymentId}`);
    }
} 