import { Container } from 'inversify';
import { TYPES } from '@Core/Types/Constants';
import { Mock } from 'jest-mock';
import { AuthMiddleware } from '../../Middleware/AuthMiddleware';

export class TestUtils {
    static createMockContainer(): Container {
        const container = new Container();
        
        // Add basic middleware mocks
        container.bind(TYPES.AuthMiddleware).toConstantValue({
            authenticate: jest.fn(),
            authenticateAdmin: jest.fn(),
            authenticateSuperAdmin: jest.fn()
        } as unknown as AuthMiddleware);

        return container;
    }

    static createSpyObj<T extends object>(baseName: string, methodNames: (keyof T)[]): jest.Mocked<T> {
        const obj: any = {};
        
        for (const method of methodNames) {
            obj[method] = jest.fn().mockName(`${baseName}.${String(method)}`);
        }

        return obj as jest.Mocked<T>;
    }

    static mockResponse() {
        return {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
    }

    static mockRequest(data: { 
        body?: any;
        params?: any;
        query?: any;
        user?: any;
        headers?: any;
    } = {}) {
        return {
            body: data.body || {},
            params: data.params || {},
            query: data.query || {},
            user: data.user || {},
            headers: data.headers || {},
        };
    }
}
