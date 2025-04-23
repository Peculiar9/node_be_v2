// import 'reflect-metadata';
// import cors from 'cors'
// import bodyParser from 'body-parser';
// import { Container } from 'inversify';
// import { InversifyExpressServer } from 'inversify-express-utils';
// import { DatabaseService } from './Infrastructure/Database/DatabaseService';
// import { getRouteInfo } from 'inversify-express-utils';

// import './Controllers/InitController';
// import './Controllers/auth/AccountController';

// import { DIContainer } from './Core/DIContainer';

// import express, { Response, Request, NextFunction } from 'express';
// import path from 'path';
// class App {
//     public app: any;

//     // constructor() {
//     //     this.app = express();
//     //     this.initialize();
//     // }

//     // private async initialize() {
//     //     const container = DIContainer.getInstance();
//     //     // this.setupServer(container);
//     //     DatabaseService.initialize(container)
//     //     .then(async () => {
//     //         console.log('✅ Database initialized successfully. Starting application...');
//     //         this.setupServer(container).then(() => {

//     //         })
//     //         .catch((error: any) => {
//     //             this.setupGracefulShutdown(container);
//     //             console.log("❌ Application startup compromised!!! ", error);
//     //         });
//     //     })
//     //     .catch((error) => {
//     //         console.error('❌ Database initialization failed:', error);
//     //         process.exit(1);
//     //     });
//     // }

//     // private async setupServer(container: Container) {
//     //     try {
//     //         if(!container){
//     //             console.log("❌ Application startup compromised");
//     //         }
//     //         // Get the DI container instance
            
//     //         // Initialize database connection
//     //         // await DatabaseService.initialize(container);

//     //         // Setup express server with inversify
//     //         const server = new InversifyExpressServer(container);
            
//     //         server.setConfig((app: any) => {
//     //             app.use(express.json());
//     //             app.use(bodyParser.json());
//     //             app.use(bodyParser.urlencoded({ extended: false }));
//     //             app.set('view engine', 'ejs');
//     //             app.set('views', path.join(__dirname, '..', 'src', 'static'));
//     //             app.use(cors());
//     //             console.log("Setting config.....");
//     //         });
            

//     //         console.log("Building server.....");
//     //         this.app = server.build();
//     //         this.initErrorHandling();
//     //         // Graceful shutdown
//     //         this.setupGracefulShutdown(container);
//     //         const routeInfo = getRouteInfo(container);
//     //         console.log(JSON.stringify(routeInfo, null, 2));
//     //     } catch (error: any) {
//     //         console.error("App initialization error:", error.message);
//     //         process.exit(1);
//     //     }
//     // }

//     constructor() {
//         this.app = express();
//         // this.initialize();
//         const container = DIContainer.getInstance();
//         this.setupServer(container);
//         console.log("App initialized");
//     }

//     // private async initialize() {
//     //     const container = DIContainer.getInstance();
//     //     try {
//     //         // Initialize database connection
//     //         await DatabaseService.initialize(container);
//     //         console.log('✅ Database initialized successfully. Starting application...');
//     //         await this.setupServer(container);
//     //     } catch (error: any) {
//     //         console.error('❌ Application initialization failed:', error);
//     //         process.exit(1);
//     //     }
//     // }

//     private async setupServer(container: Container) {
//         try {
//             // Setup express server with inversify
//             const server = new InversifyExpressServer(container);
//             await DatabaseService.initialize(container);
//             server.setConfig((app: any) => {
//                 console.log('Configuring Express App: ');
//                 app.use(express.json());
//                 app.use(bodyParser.json());
//                 app.use(bodyParser.urlencoded({ extended: false }));
//                 app.set('view engine', 'ejs');
//                 app.set('views', path.join(__dirname, '..', 'src', 'static'));
//                 app.use(cors());
//                 console.log("Setting config.....");
//             });

//             console.log("Building server.....");
//             this.app = server.build();
//             console.log("Server built maybe because async can async here.....");
//             this.initErrorHandling();
//             // Graceful shutdown
//             this.setupGracefulShutdown(container);
//             const routeInfo = getRouteInfo(container);
//             console.log(JSON.stringify(routeInfo, null, 2));
//         } catch (error: any) {
//             console.error("App initialization error:", error.message);
//             process.exit(1);
//         }
//     }

//     private initErrorHandling() {
//         this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
//             console.error(err.stack);
//             res.status(err.status || 500).json({
//                 success: false,
//                 message: err.message || 'Internal Server Error',
//             });
//         });
//     }

//     private setupGracefulShutdown(container: Container) {
//         const shutdown = async () => {
//             console.log('Shutting down gracefully...');
//             await DatabaseService.shutdown(container);
//             process.exit(0);
//         };

//         process.on('SIGTERM', shutdown);
//         process.on('SIGINT', shutdown);
//     }
// }

// export default new App().app;


// App.ts file

// import 'reflect-metadata';
// import dotenv from 'dotenv';
// import App from './App';
// import { APP_NAME } from './Core/Types/Constants';

// dotenv.config();

// const startApp = async () => {
//     try {
//         const port = process.env.PORT || 3000;
        
//         const server = App.listen(port, () => {
//             console.log(`${APP_NAME} Server is running on port http://localhost:${port}`);
//         });

//         // Handle graceful shutdown
//         process.on('SIGTERM', async () => {
//             console.log('SIGTERM signal received');
//             server.close(() => {
//                 console.log('Server closed');
//                 process.exit(0);
//             });
//         });

//     } catch (error: any) {
//         console.error('Error starting server:', error.message);
//         process.exit(1);
//     }
// };

// startApp().then(() => console.log("APP_START"));

// Index.ts file



//AUTH SERVICE FOR TOKEN VERIFICATION SYSTEM
     // Generate verification token
            // const verificationToken = await this.generateVerificationToken(newUser);

            // Store verification token
            // await this.userRepository.update(newUser._id as string, {
            //     verification_token: await UtilityService.hashToken(verificationToken)
            // });

            // Send verification email (could be a separate microservice or event)
            // await this.emailService.sendVerificationEmail(
            //     newUser.email,
            //     verificationToken
            // );





            /// Auth Service, Will test later

            // import { Container } from 'inversify';
// import { AuthService } from '../../Infrastructure/Services/AuthService';
// import { TYPES } from '../../Core/Types/Constants';
// import { TestUtils } from '../utils/TestUtils';
// import { mockUserData } from '../mocks/MockData';
// import { ValidationError } from '../../Core/Application/Error/AppError';
// import { ResponseMessage } from '../../Core/Application/Response/ResponseFormat';

// describe('AuthService', () => {
//     let container: Container;
//     let authService: AuthService;
//     let mockUserRepository: any;
//     let mockTransactionManager: any;

//     beforeEach(() => {
//         container = TestUtils.createMockContainer();
        
//         mockUserRepository = TestUtils.createSpyObj('UserRepository', [
//             'findByEmail',
//             'create',
//             'update',
//             'findById'
//         ]);

//         mockTransactionManager = TestUtils.createSpyObj('TransactionManager', [
//             'beginTransaction',
//             'commit',
//             'rollback'
//         ]);

//         container.bind(TYPES.UserRepository).toConstantValue(mockUserRepository);
//         container.bind(TYPES.TransactionManager).toConstantValue(mockTransactionManager);
//         container.bind(AuthService).toSelf();

//         authService = container.get(AuthService);
//     });

//     describe('createUser', () => {
//         it('should create a new user successfully', async () => {
//             mockUserRepository.findByEmail.mockResolvedValue(null);
//             mockUserRepository.create.mockResolvedValue(mockUserData.userResponseDTO);

//             const result = await authService.createUser(mockUserData.createUserDTO);

//             expect(result).toEqual(mockUserData.userResponseDTO);
//             expect(mockTransactionManager.beginTransaction).toHaveBeenCalled();
//             expect(mockTransactionManager.commit).toHaveBeenCalled();
//         });

//         it('should throw error if user already exists', async () => {
//             mockUserRepository.findByEmail.mockResolvedValue(mockUserData.userResponseDTO);

//             await expect(authService.createUser(mockUserData.createUserDTO))
//                 .rejects
//                 .toThrow(ResponseMessage.USER_EXISTS_MESSAGE);
//         });
//     });

//     describe('authenticate', () => {
//         it('should authenticate user and return tokens', async () => {
//             mockUserRepository.findByEmail.mockResolvedValue({
//                 ...mockUserData.userResponseDTO,
//                 password: 'hashedPassword'
//             });

//             const result = await authService.authenticate('test@example.com', 'password');

//             expect(result).toHaveProperty('accessToken');
//             expect(result).toHaveProperty('refreshToken');
//             expect(result).toHaveProperty('user');
//         });

//         it('should throw error for invalid credentials', async () => {
//             mockUserRepository.findByEmail.mockResolvedValue(null);

//             await expect(authService.authenticate('test@example.com', 'password'))
//                 .rejects
//                 .toThrow(ResponseMessage.INVALID_CREDENTIALS_MESSAGE);
//         });
//     });

//     // Add more test cases for other methods...
// });



// import { IRepository } from "../../../Core/Application/Interface/Persistence/Repository/IRepository";
// import { TransactionManager } from "./Abstractions/TransactionManager";
// import { QueryResult } from 'pg';
// import { DatabaseError } from "../../../Core/Application/Error/AppError";
// import { TableNames } from "../../../Core/Application/Enums/TableNames";



// /**
//  * Base repository class implementing common database operations
//  * @template T The entity type this repository manages
//  */
// export abstract class BaseRepository<T> implements IRepository<T> {
//     protected readonly tableName: string;
//     protected transactionManager: TransactionManager;

//     /**
//      * Creates a new repository instance
//      * @param transactionManager Transaction manager for handling database transactions
//      * @param tableName The name of the database table this repository manages
//      */
//     constructor(transactionManager: TransactionManager, tableName: TableNames) {
//         this.transactionManager = transactionManager;
//         this.tableName = tableName;
//     }

//     /**
//      * Executes a database query with parameters
//      * @param query SQL query string
//      * @param params Query parameters
//      * @returns Query result
//      * @throws DatabaseError if query execution fails
//      */
//     protected async executeQuery<R = any>(query: string, params: any[] = []): Promise<QueryResult<QueryResult>> {
//         try {
//             const client = this.transactionManager.getClient();
//             return await client.query(query, params);
//         } catch (error: any) {
//             throw new DatabaseError(`Query execution failed: ${error.message}`);
//         }
//     }

//     /**
//      * Extracts column information from an entity for database operations
//      * @param entity Partial entity object
//      * @returns Object containing columns, values, and SQL placeholders
//      */
//     protected getEntityColumns(entity: Partial<T>): {
//         columns: string[];
//         values: any[];
//         placeholders: string[];
//     } {
//         const columns: string[] = [];
//         const values: any[] = [];
//         const placeholders: string[] = [];
//         let parameterIndex = 1;

//         for (const [key, value] of Object.entries(entity)) {
//             if (value === undefined) continue;
            
//             const columnName = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
//             columns.push(columnName);
//             values.push(value);
//             placeholders.push(`$${parameterIndex}`);
//             parameterIndex++;
//         }

        

//         return { columns, values, placeholders };
//     }

//     /**
//      * Builds a WHERE clause from a predicate object
//      * @param predicate Conditions for the WHERE clause
//      * @returns Object containing the WHERE clause and parameter values
//      */
//     protected buildWhereClause(predicate: Partial<T>): { 
//         whereClause: string; 
//         values: any[] 
//     } {
//         const conditions: string[] = [];
//         const values: any[] = [];
//         let parameterIndex = 1;

//         for (const [key, value] of Object.entries(predicate)) {
//             conditions.push(`${key} = $${parameterIndex}`);
//             values.push(value);
//             parameterIndex++;
//         }

//         return {
//             whereClause: conditions.length > 0 
//                 ? `WHERE ${conditions.join(' AND ')}` 
//                 : '',
//             values
//         };
//     }

//     /**
//      * Builds SET clause for UPDATE operations
//      * @param entity Entity with fields to update
//      * @returns Object containing the SET clause and parameter values
//      */
//     protected buildUpdateSet(entity: Partial<T>): {
//         setClause: string;
//         values: any[];
//     } {
//         const updates: string[] = [];
//         const values: any[] = [];
//         let parameterIndex = 1;

//         for (const [key, value] of Object.entries(entity)) {
//             if (key !== 'id' && value !== undefined) {
//                 updates.push(`${key} = $${parameterIndex}`);
//                 values.push(value);
//                 parameterIndex++;
//             }
//         }

//         return {
//             setClause: updates.join(', '),
//             values
//         };
//     }

//     /**
//      * Bulk creates multiple entities
//      * @param entities Array of entities to create
//      * @returns Array of created entities
//      */
//     protected async bulkCreate(entities: T[]): Promise<T[]> {
//         if (entities.length === 0) return [];

//         const { columns, values, placeholders } = this.getBulkEntityColumns(entities);
//         const query = `
//             INSERT INTO ${this.tableName} (${columns.join(', ')})
//             VALUES ${this.createBulkValuePlaceholders(entities.length, columns.length)}
//             RETURNING *
//         `;

//         const result = await this.executeQuery<T>(query, values);
//         return result.rows;
//     }

//     /**
//      * Bulk updates multiple entities
//      * @param entities Array of entities with their IDs
//      * @returns Array of updated entities
//      */
//     protected async bulkUpdate(entities: Array<Partial<T> & { id: string }>): Promise<T[]> {
//         if (entities.length === 0) return [];

//         const updates = entities.map((entity, index) => {
//             const { setClause, values } = this.buildUpdateSet(entity);
//             const offset = index * values.length;
//             const placeholders = values.map((_, i) => `$${offset + i + 1}`).join(', ');
//             return `
//                 UPDATE ${this.tableName}
//                 SET ${setClause.replace(/\$\d+/g, (match) => `$${parseInt(match.slice(1)) + offset}`)}
//                 WHERE id = '${entity.id}'
//                 RETURNING *
//             `;
//         });

//         const query = updates.join(' UNION ALL ');
//         const values = entities.flatMap(entity => {
//             const { values } = this.buildUpdateSet(entity);
//             return values;
//         });

//         const result = await this.executeQuery<T>(query, values);
//         return result.rows;
//     }

//     /**
//      * Bulk deletes multiple entities by their IDs
//      * @param ids Array of entity IDs to delete
//      * @returns Number of deleted entities
//      */
//     protected async bulkDelete(ids: string[]): Promise<number> {
//         if (ids.length === 0) return 0;

//         const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
//         const query = `
//             DELETE FROM ${this.tableName}
//             WHERE id IN (${placeholders})
//         `;

//         const result = await this.executeQuery(query, ids);
//         return result.rowCount;
//     }

//     /**
//      * Helper method for bulk operations to extract column information
//      */
//     private getBulkEntityColumns(entities: Partial<T>[]): {
//         columns: string[];
//         values: any[];
//         placeholders: string[];
//     } {
//         const columns = Object.keys(entities[0]).map(key => 
//             key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
//         );
//         const values: any[] = [];
//         const placeholders: string[] = [];

//         entities.forEach(entity => {
//             columns.forEach(column => {
//                 const key = column.replace(/_([a-z])/g, g => g[1].toUpperCase());
//                 values.push(entity[key as keyof Partial<T>]);
//             });
//         });

//         return { columns, values, placeholders };
//     }

//     /**
//      * Helper method to create placeholders for bulk insert
//      */
//     private createBulkValuePlaceholders(numEntities: number, numColumns: number): string {
//         const rows: string[] = [];
//         for (let i = 0; i < numEntities; i++) {
//             const offset = i * numColumns;
//             const row = `(${Array.from({ length: numColumns }, (_, j) => `$${offset + j + 1}`).join(', ')})`;
//             rows.push(row);
//         }
//         return rows.join(', ');
//     }

//     // Abstract methods to be implemented by specific repositories
//     abstract findById(id: string): Promise<T | null>;
//     abstract findAll(): Promise<T[]>;
//     abstract findByCondition(condition: Partial<T>): Promise<T[]>;
//     abstract create(entity: T): Promise<T>;
//     abstract update(id: string, entity: Partial<T>): Promise<T | null>;
//     abstract delete(id: string): Promise<boolean>;
//     abstract executeRawQuery(query: string, params: any[]): Promise<any>;
//     abstract count(condition?: Partial<T>): Promise<number>;
//     abstract bulkCreate(entities: T[]): Promise<T[]>;
//     abstract bulkUpdate(entities: Array<Partial<T> & { id: string }>): Promise<T[]>;
//     abstract bulkDelete(ids: string[]): Promise<number>;
// }



// public async updateOtpInstance(verificationId: string, otp: string, salt: string): Promise<Verification> {
//      try {
//          await this._transactionManager.beginTransaction({
//              isolationLevel: DatabaseIsolationLevel.READ_COMMITTED,
//          });
//          console.log("OTP Code: ", otp);
//          // Get the current verification record to check attempts
//          const currentVerification = await this._verificationRepository.findById(verificationId);
//          if (!currentVerification) {
//              throw new Error('Verification record not found');
//          }
 
//          // Extract current attempts and increment
//          const currentAttempts = currentVerification.otp?.attempts || 0;
//          const updatedAttempts = currentAttempts + 1;
 
//          // Update attempts directly using raw query for efficiency
//          await this._verificationRepository.executeRawQuery(
//              `UPDATE ${TableNames.VERIFICATIONS} 
//              SET otp = jsonb_set(
//                  otp::jsonb,
//                  '{attempts}',
//                  $1::text::jsonb
//              )
//              WHERE _id = $2`,
//              [updatedAttempts, verificationId]
//          );
//          const verification = {
//              otp: {
//              code: CryptoService.hashString(otp, salt),
//              expiry: UtilityService.dateToUnix(new Date(Date.now() + 10 * 60 * 1000)), //expires in 10mins
//              attempts: 0,
//              lastAttempt: UtilityService.dateToUnix(new Date()) || null,
//              verified: false
//          },
//          reference: UtilityService.generateUUID()
//      }
 
//          const result: Verification = await this._verificationRepository.update(verificationId, verification) as Verification;   
//          await this._transactionManager.commit();
//          return result;
//      } catch (error: any) {
//          await this._transactionManager.rollback();
//          throw new Error(error.message);
//          }
//      }   