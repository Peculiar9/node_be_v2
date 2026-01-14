import { injectable, inject } from 'inversify';
import { TYPES } from '@Core/Types/Constants';
import { BaseApiService } from '../../API/BaseApiService';
import { HttpClientFactory } from '../../Http/HttpClientFactory';
import { 
    IVerifyMeService, 
    NINVerificationResult, 
    BVNVerificationResult,
    TINVerificationResult,
    NINVerificationData,
    BVNVerificationData
} from '@Core/Application/Interface/Services/IVerifyMeService';
import { ServiceError } from '@Core/Application/Error/AppError';

@injectable()
export class VerifyMeService extends BaseApiService implements IVerifyMeService {
    constructor(
        @inject(TYPES.HttpClientFactory) httpClientFactory: HttpClientFactory
    ) {
        super(httpClientFactory, process.env.VERIFYME_BASE_URL || 'https://vapi.verifyme.ng/v1', {
            timeout: 15000,
            headers: {
                'Authorization': `Bearer ${process.env.VERIFYME_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Verify NIN by National Identity Number
     * @param nin National Identity Number
     * @param data Verification data (firstname, lastname, dob)
     * @returns NIN verification result
     */
    async verifyNIN(nin: string, data: NINVerificationData): Promise<NINVerificationResult> {
        try {
            console.log('🔍 VerifyMeService::verifyNIN -> Starting verification', { nin });

            // 🚧 MOCKED RESPONSE - Comment out when API keys are ready
            return this.getMockedNINResponse(nin, data);

            // ✅ REAL API CALL - Uncomment when API keys are ready
            // const response = await this.httpClient.post(
            //     `/verifications/identities/nin/${nin}`,
            //     data
            // ) as any;
            // return this.parseNINResponse(response.data);

        } catch (error: any) {
            console.error('❌ VerifyMeService::verifyNIN -> Error:', error);
            throw new ServiceError(`NIN verification failed: ${error.message}`);
        }
    }

    /**
     * Verify NIN by registered phone number
     * @param phone NIMC registered phone number
     * @param data Verification data (firstname, lastname, dob)
     * @returns NIN verification result
     */
    async verifyNINByPhone(phone: string, data: NINVerificationData): Promise<NINVerificationResult> {
        try {
            console.log('🔍 VerifyMeService::verifyNINByPhone -> Starting verification', { phone });

            // 🚧 MOCKED RESPONSE - Comment out when API keys are ready
            return this.getMockedNINResponse(phone, data);

            // ✅ REAL API CALL - Uncomment when API keys are ready
            // const response = await this.httpClient.post(
            //     `/verifications/identities/nin_phone/${phone}`,
            //     data
            // ) as any;
            // return this.parseNINResponse(response.data);

        } catch (error: any) {
            console.error('❌ VerifyMeService::verifyNINByPhone -> Error:', error);
            throw new ServiceError(`NIN verification by phone failed: ${error.message}`);
        }
    }

    /**
     * Verify BVN (Bank Verification Number)
     * @param bvn Bank Verification Number
     * @param data Verification data (firstname, lastname, dob)
     * @param type Verification type (basic or premium)
     * @returns BVN verification result
     */
    async verifyBVN(
        bvn: string, 
        data: BVNVerificationData, 
        type: 'basic' | 'premium' = 'basic'
    ): Promise<BVNVerificationResult> {
        try {
            console.log('🔍 VerifyMeService::verifyBVN -> Starting verification', { bvn, type });

            // 🚧 MOCKED RESPONSE - Comment out when API keys are ready
            return this.getMockedBVNResponse(bvn, data, type);

            // ✅ REAL API CALL - Uncomment when API keys are ready
            // const response = await this.httpClient.post(
            //     `/verifications/identities/bvn/${bvn}?type=${type}`,
            //     data
            // ) as any;
            // return this.parseBVNResponse(response.data, type);

        } catch (error: any) {
            console.error('❌ VerifyMeService::verifyBVN -> Error:', error);
            throw new ServiceError(`BVN verification failed: ${error.message}`);
        }
    }

    /**
     * Verify TIN (Tax Identification Number)
     * @param tin Tax Identification Number (Format: XXXXXXXX-XXXX)
     * @returns TIN verification result
     */
    async verifyTIN(tin: string): Promise<TINVerificationResult> {
        try {
            console.log('🔍 VerifyMeService::verifyTIN -> Starting verification', { tin });

            // Validate TIN format
            const tinRegex = /^\d{8}-\d{4}$/;
            if (!tinRegex.test(tin)) {
                return {
                    verified: false,
                    status: 'error',
                    message: 'Invalid TIN Format. Valid Tin format => XXXXXXXX-XXXX'
                };
            }

            // 🚧 MOCKED RESPONSE - Comment out when API keys are ready
            return this.getMockedTINResponse(tin);

            // ✅ REAL API CALL - Uncomment when API keys are ready
            // const response = await this.httpClient.get(
            //     `/verifications/identities/tin/${tin}`
            // ) as any;
            // return this.parseTINResponse(response.data);

        } catch (error: any) {
            console.error('❌ VerifyMeService::verifyTIN -> Error:', error);
            throw new ServiceError(`TIN verification failed: ${error.message}`);
        }
    }

    // ==================== RESPONSE PARSERS ====================

    private parseNINResponse(data: any): NINVerificationResult {
        if (data.status === 'success') {
            return {
                verified: true,
                status: 'success',
                message: 'NIN verification successful',
                data: {
                    nin: data.data?.nin,
                    firstname: data.data?.firstname,
                    lastname: data.data?.lastname,
                    middlename: data.data?.middlename,
                    phone: data.data?.phone,
                    gender: data.data?.gender,
                    birthdate: data.data?.birthdate,
                    photo: data.data?.photo,
                    fieldMatches: data.data?.fieldMatches
                }
            };
        }

        return {
            verified: false,
            status: 'error',
            message: data.message || 'NIN verification failed'
        };
    }

    private parseBVNResponse(data: any, type: 'basic' | 'premium'): BVNVerificationResult {
        if (data.status === 'success') {
            const result: BVNVerificationResult = {
                verified: true,
                status: 'success',
                message: 'BVN verification successful',
                data: {
                    bvn: data.data?.bvn,
                    firstname: data.data?.firstname,
                    lastname: data.data?.lastname,
                    middlename: data.data?.middlename,
                    phone: data.data?.phone,
                    gender: data.data?.gender,
                    birthdate: data.data?.birthdate,
                    photo: data.data?.photo,
                    fieldMatches: data.data?.fieldMatches
                }
            };

            // Add premium fields if type is premium
            if (type === 'premium') {
                result.data = {
                    ...result.data,
                    maritalStatus: data.data?.maritalStatus,
                    lgaOfResidence: data.data?.lgaOfResidence,
                    lgaOfOrigin: data.data?.lgaOfOrigin,
                    residentialAddress: data.data?.residentialAddress,
                    stateOfOrigin: data.data?.stateOfOrigin,
                    enrollmentBank: data.data?.enrollmentBank,
                    enrollmentBranch: data.data?.enrollmentBranch,
                    nameOnCard: data.data?.nameOnCard,
                    title: data.data?.title,
                    levelOfAccount: data.data?.levelOfAccount
                };
            }

            return result;
        }

        return {
            verified: false,
            status: 'error',
            message: data.message || 'BVN verification failed'
        };
    }

    private parseTINResponse(data: any): TINVerificationResult {
        if (data.status === 'success') {
            return {
                verified: true,
                status: 'success',
                message: 'TIN verification successful',
                data: {
                    tin: data.data?.tin,
                    taxpayerName: data.data?.taxpayerName,
                    cacRegNo: data.data?.cacRegNo,
                    entityType: data.data?.entityType,
                    jittin: data.data?.jittin,
                    taxOffice: data.data?.taxOffice,
                    phone: data.data?.phone,
                    email: data.data?.email
                }
            };
        }

        return {
            verified: false,
            status: 'error',
            message: data.message || 'TIN verification failed'
        };
    }

    // ==================== MOCKED RESPONSES ====================

    /**
     * 🚧 MOCKED NIN RESPONSE
     * Returns test data based on test persona (John Doe with NIN: 10000000001)
     * Remove this method when API keys are ready
     */
    private getMockedNINResponse(ref: string, data: NINVerificationData): NINVerificationResult {
        console.log('🧪 Using MOCKED NIN response');

        // Simulate successful verification for test persona
        if (ref === '10000000001' || ref === '08000000000') {
            return {
                verified: true,
                status: 'success',
                message: 'NIN verification successful (MOCKED)',
                data: {
                    nin: '10000000001',
                    firstname: 'JOHN',
                    lastname: 'DOE',
                    middlename: 'JAMES',
                    phone: '08100000000',
                    gender: 'Male',
                    birthdate: '31-05-2000',
                    photo: '<base64_photo_data>',
                    fieldMatches: {
                        firstname: data.firstname.toUpperCase() === 'JOHN',
                        lastname: data.lastname.toUpperCase() === 'DOE',
                        dob: data.dob === '31-05-2000'
                    }
                }
            };
        }

        // Simulate failed verification for other inputs
        return {
            verified: false,
            status: 'error',
            message: 'NIN not found (MOCKED - use test persona: 10000000001)'
        };
    }

    /**
     * 🚧 MOCKED BVN RESPONSE
     * Returns test data based on test persona (John Doe with BVN: 10000000001)
     * Remove this method when API keys are ready
     */
    private getMockedBVNResponse(
        bvn: string, 
        data: BVNVerificationData, 
        type: 'basic' | 'premium'
    ): BVNVerificationResult {
        console.log('🧪 Using MOCKED BVN response');

        // Simulate successful verification for test persona
        if (bvn === '10000000001') {
            const basicData = {
                bvn: '10000000001',
                firstname: 'JOHN',
                lastname: 'DOE',
                middlename: 'JAMES',
                phone: '08100000000',
                gender: 'Male',
                birthdate: '31-05-2000',
                photo: '<base64_photo_data>',
                fieldMatches: {
                    firstname: data.firstname.toUpperCase() === 'JOHN',
                    lastname: data.lastname.toUpperCase() === 'DOE',
                    dob: data.dob === '31-05-2000'
                }
            };

            if (type === 'premium') {
                return {
                    verified: true,
                    status: 'success',
                    message: 'BVN verification successful - Premium (MOCKED)',
                    data: {
                        ...basicData,
                        maritalStatus: 'Single',
                        lgaOfResidence: 'Surulere',
                        lgaOfOrigin: 'Ijebu Ode',
                        residentialAddress: '1 Jameson Street',
                        stateOfOrigin: 'Ogun State',
                        enrollmentBank: '058',
                        enrollmentBranch: 'BODIJA',
                        nameOnCard: 'JOHN DOE',
                        title: 'Mr',
                        levelOfAccount: 'Level 2 - Medium Level Accounts'
                    }
                };
            }

            return {
                verified: true,
                status: 'success',
                message: 'BVN verification successful - Basic (MOCKED)',
                data: basicData
            };
        }

        // Simulate failed verification
        return {
            verified: false,
            status: 'error',
            message: 'BVN not found (MOCKED - use test persona: 10000000001)'
        };
    }

    /**
     * 🚧 MOCKED TIN RESPONSE
     * Returns test data based on test persona (TIN: 00000000-0000)
     * Remove this method when API keys are ready
     */
    private getMockedTINResponse(tin: string): TINVerificationResult {
        console.log('🧪 Using MOCKED TIN response');

        // Simulate successful verification for test persona
        if (tin === '00000000-0000') {
            return {
                verified: true,
                status: 'success',
                message: 'TIN verification successful (MOCKED)',
                data: {
                    tin: '00000000-0000',
                    taxpayerName: 'John Doe',
                    cacRegNo: 'RC18*****',
                    entityType: '00000000-0000',
                    jittin: '',
                    taxOffice: 'Tax Office Address',
                    phone: '090********',
                    email: 'johndoe@gmail.com'
                }
            };
        }

        // Simulate failed verification
        return {
            verified: false,
            status: 'error',
            message: 'Company with provided TIN details not found (MOCKED - use test persona: 00000000-0000)'
        };
    }
}
