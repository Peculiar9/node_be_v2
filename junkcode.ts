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