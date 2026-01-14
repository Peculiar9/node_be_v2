module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@extensions/(.*)$': '<rootDir>/src/extensions/$1',
        '^@Core/(.*)$': '<rootDir>/src/Core/$1',
        '^@Infrastructure/(.*)$': '<rootDir>/src/Infrastructure/$1',
        '^@Presentation/(.*)$': '<rootDir>/src/Presentation/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/build/',
        '/dist/',
        '/tests/mocks/'
    ],
    setupFiles: ['<rootDir>/src/tests/setup.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/tests/**/*.{ts,tsx}'
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/build/',
        '/dist/'
    ]
};
