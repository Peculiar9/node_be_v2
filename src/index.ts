import 'reflect-metadata';
import dotenv from 'dotenv';
import App from './App';
import { APP_NAME } from './Core/Types/Constants';

dotenv.config();

const startApp = async () => {
    try {
        const app = await App.initialize();
        const port = process.env.PORT || 3000;
        
        const server = app.listen(port, () => {
            console.log(`${APP_NAME} Server is running on port http://localhost:${port}`);
        });

        // Handle graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM signal received');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });
    } catch (error: any) {
        console.error('Error starting server:', error.message);
        process.exit(1);
    }
};

startApp().then(() => console.log("APP_START"));