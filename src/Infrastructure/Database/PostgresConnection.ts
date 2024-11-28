// import { Pool } from 'pg';
// import { injectable } from 'inversify';

// export class PostgresConnection {
//   private static instance: Pool;

//   private constructor() {}

//   public static getInstance(): Pool {
//     if (!PostgresConnection.instance) {
//       PostgresConnection.instance = new Pool({
//         user: process.env.DB_USER,
//         host: process.env.DB_HOST,
//         database: process.env.DB_NAME,
//         password: process.env.DB_PASSWORD,
//         port: parseInt(process.env.DB_PORT || '5432'),
//       });
//     }
//     return PostgresConnection.instance;
//   }

//   public static async closeConnection(): Promise<void> {
//     if (PostgresConnection.instance) {
//       await PostgresConnection.instance.end();
//     }
//   }
// }