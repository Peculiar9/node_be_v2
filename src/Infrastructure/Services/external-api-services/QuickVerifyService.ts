import { injectable, inject } from 'inversify';
import { TYPES } from '@Core/Types/Constants';
import { BaseApiService } from '../../API/BaseApiService';
import { HttpClientFactory } from '../../Http/HttpClientFactory';
import { 
    IQuickVerifyService, 
    NINVerificationResult, 
    TINVerificationResult,
    DemographicData 
} from '@Core/Application/Interface/Services/IQuickVerifyService';
import { ServiceError } from '@Core/Application/Error/AppError';

@injectable()
export class QuickVerifyService extends BaseApiService implements IQuickVerifyService {
    constructor(
        @inject(TYPES.HttpClientFactory) httpClientFactory: HttpClientFactory
    ) {
        super(httpClientFactory, process.env.QUICKVERIFY_BASE_URL!, {
            timeout: 10000,
            headers: {
                'x-api-key': process.env.QUICKVERIFY_API_KEY!,
                'Content-Type': 'application/json'
            }
        });
    }

    async verifyNIN(nin: string): Promise<NINVerificationResult> {
        try {
            const response = await this.httpClient.post('/verification/nin-search', { nin }) as any;
            return this.parseNINResponse(response.data);
        } catch (error: any) {
            throw new ServiceError(`NIN verification failed: ${error.message}`);
        }
    }

    async verifyNINByPhone(phone: string): Promise<NINVerificationResult> {
        try {
            const response = await this.httpClient.post('/verification/nin-phone', { phone }) as any;
            return this.parseNINResponse(response.data);
        } catch (error: any) {
            throw new ServiceError(`NIN verification by phone failed: ${error.message}`);
        }
    }

    async verifyNINByDemographics(data: DemographicData): Promise<NINVerificationResult> {
        try {
            const response = await this.httpClient.post('/verification/nin-demography', data) as any;
            return this.parseNINResponse(response.data);
        } catch (error: any) {
            throw new ServiceError(`NIN verification by demographics failed: ${error.message}`);
        }
    }

    async verifyNINByTrackingId(tid: string): Promise<NINVerificationResult> {
        try {
            const response = await this.httpClient.post('/verification/ninbytrackingid', { tid }) as any;
            return this.parseNINResponse(response.data);
        } catch (error: any) {
            throw new ServiceError(`NIN verification by tracking ID failed: ${error.message}`);
        }
    }

    async verifyTIN(tin: string): Promise<TINVerificationResult> {
        try {
            const response = await this.httpClient.post('/verification/tin', { tin }) as any;
            return this.parseTINResponse(response.data);
        } catch (error: any) {
            throw new ServiceError(`TIN verification failed: ${error.message}`);
        }
    }

    private parseNINResponse(data: any): NINVerificationResult {
        const responseCode = data.response_code || data.responseCode;
        
        return {
            verified: responseCode === '00',
            response_code: responseCode,
            message: this.getResponseMessage(responseCode),
            data: responseCode === '00' ? {
                nin: data.data?.nin || data.nin,
                firstname: data.data?.firstname || data.firstname,
                lastname: data.data?.lastname || data.lastname,
                middlename: data.data?.middlename || data.middlename,
                gender: data.data?.gender || data.gender,
                dob: data.data?.dob || data.dateOfBirth,
                phone: data.data?.phone || data.phoneNumber,
                email: data.data?.email,
                address: data.data?.address,
                photo: data.data?.photo
            } : undefined
        };
    }

    private parseTINResponse(data: any): TINVerificationResult {
        const responseCode = data.response_code || data.responseCode;
        
        return {
            verified: responseCode === '00',
            response_code: responseCode,
            message: this.getResponseMessage(responseCode),
            data: responseCode === '00' ? {
                tin: data.data?.tin || data.tin,
                company_name: data.data?.company_name || data.companyName,
                tax_office: data.data?.tax_office || data.taxOffice,
                registration_date: data.data?.registration_date || data.registrationDate,
                taxpayer_name: data.data?.taxpayer_name || data.taxpayerName
            } : undefined
        };
    }

    private getResponseMessage(code: string): string {
        switch(code) {
            case '00':
                return 'Verification successful';
            case '01':
                return 'Record not found';
            case '02':
                return 'Service unavailable';
            default:
                return 'Unknown response code';
        }
    }
}
