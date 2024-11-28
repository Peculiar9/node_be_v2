// import { injectable } from 'inversify';
// import { BaseRepository } from '../BaseRepository';
// import { TransactionManager } from '../Abstractions/TransactionManager';
// import { IFile } from '../../../../Core/Application/Interface/Entities/files/IFile';
// import { TableNames } from '../../../../Core/Application/Enums/TableNames';

// @injectable()
// export class FileRepository extends BaseRepository<IFile> {
//     constructor(transactionManager: TransactionManager) {
//         super(transactionManager, TableNames.FILES);
//     }

//     async findById(id: number): Promise<IFile | null> {
//         const result = await this.executeQuery<IFile>(
//             `SELECT * FROM ${this.tableName} WHERE id = $1`,
//             [id]
//         );
//         return result.rows[0] || null;
//     }

//     async findAll(): Promise<IFile[]> {
//         const result = await this.executeQuery<IFile>(
//             `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
//         );
//         return result.rows;
//     }

//     async create(entity: IFile): Promise<IFile> {
//         const { columns, values, placeholders } = this.getEntityColumns(entity);
        
//         const query = `
//             INSERT INTO ${this.tableName} (${columns.join(', ')})
//             VALUES (${placeholders.join(', ')})
//             RETURNING *
//         `;

//         const result = await this.executeQuery<IFile>(query, values);
//         return result.rows[0];
//     }

//     async findByCondition(condition: Partial<IFile>): Promise<IFile[]> {
//         const { whereClause, values } = this.buildWhereClause(condition);
//         const result = await this.executeQuery<IFile>(
//             `SELECT * FROM ${this.tableName} ${whereClause}`,
//             values
//         );
//         return result.rows;
//     }

//     async update(id: number, entity: Partial<IFile>): Promise<IFile | null> {
//         const { setClause, values } = this.buildUpdateSet(entity);
//         const result = await this.executeQuery<IFile>(
//             `UPDATE ${this.tableName} 
//              SET ${setClause} 
//              WHERE id = $${values.length + 1}
//              RETURNING *`,
//             [...values, id]
//         );
//         return result.rows[0] || null;
//     }

//     async delete(id: number): Promise<boolean> {
//         const result = await this.executeQuery(
//             `DELETE FROM ${this.tableName} WHERE id = $1`,
//             [id]
//         );
//         return result.rowCount > 0;
//     }

//     async executeRawQuery(query: string, params: any[]): Promise<any> {
//         const result = await this.executeQuery(query, params);
//         return result.rows;
//     }

//     async count(condition?: Partial<IFile>): Promise<number> {
//         if (condition) {
//             const { whereClause, values } = this.buildWhereClause(condition);
//             const result = await this.executeQuery<{ count: string }>(
//                 `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`,
//                 values
//             );
//             return parseInt(result.rows[0].count);
//         }

//         const result = await this.executeQuery<{ count: string }>(
//             `SELECT COUNT(*) as count FROM ${this.tableName}`
//         );
//         return parseInt(result.rows[0].count);
//     }
// }