export const TYPES = {
    ConnectionPoolManager: Symbol.for("ConnectionPoolManager"),
    UserRepository: Symbol.for('UserRepository'),
    AccountUseCase: Symbol.for('AccountUseCase'),
    AuthService: Symbol.for('AuthService'),
    TransactionManager: Symbol.for('TransactionManager'),
    AuthMiddleware: Symbol.for('AuthMiddleware')
};

export const API_PATH = 'api/v1';
export const APP_NAME = 'node_project_template';
export const APP_VERSION = 'v1';
export const API_DOC_URL = '/';