import { injectable, inject } from 'inversify';
import { TYPES } from '@Core/Types/Constants';
import { BaseRepository } from '../BaseRepository';
import { TransactionManager } from '../Abstractions/TransactionManager';
import { IFileManager } from '@Core/Application/Interface/Entities/file-manager/IFileManager';
import { TableNames } from '@Core/Application/Enums/TableNames';
import { FileManager } from '@Core/Application/Entities/FileManager';
import { Console, LogLevel } from '../../../Utils/Console';

@injectable()
export class FileManagerRepository extends BaseRepository<IFileManager> {
    
    constructor(@inject(TYPES.TransactionManager) transactionManager: TransactionManager) {
        super(transactionManager, TableNames.FILE_MANAGER);
    }

    async findById(id: string): Promise<IFileManager | null> {
        const result = await this.executeQuery<IFileManager>(
            `SELECT * FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        return result.rows[0] as unknown as IFileManager || null;
    }

    async findAll(): Promise<IFileManager[]> {
        const result = await this.executeQuery<IFileManager>(
            `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
        );
        return result.rows as unknown as IFileManager[];
    }

    async findByCondition(condition: Partial<IFileManager>): Promise<IFileManager[]> {
        const { whereClause, values } = this.buildWhereClause(condition);
        const result = await this.executeQuery<IFileManager>(
            `SELECT * FROM ${this.tableName} ${whereClause}`,
            values
        );
        return result.rows as unknown as IFileManager[];
    }

    async create(entity: Partial<IFileManager>): Promise<IFileManager> {
        const { columns, values, placeholders } = this.getEntityColumns(entity);
        
        const query = `
            INSERT INTO ${this.tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING *
        `;

        console.log("Create FileManager Query: ", {query})
        console.log("Create FileManager Values: ", {values})
        const result = await this.executeQuery<IFileManager>(query, values);
        return result.rows[0] as unknown as IFileManager;
    }

    async executeRawQuery(query: string, params: any[]): Promise<any> {
        return this.executeQuery(query, params);
    }

    async count(condition?: Partial<IFileManager>): Promise<number> {
        if (condition) {
            const { whereClause, values } = this.buildWhereClause(condition);
            const result = await this.executeQuery<{ count: string }>(
                `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`,
                values
            );
            return parseInt((result.rows[0] as any).count, 10);
        }

        const result = await this.executeQuery<{ count: string }>(
            `SELECT COUNT(*) as count FROM ${this.tableName}`
        );
        return parseInt((result.rows[0] as any).count, 10);
    }

    async bulkCreate(entities: IFileManager[]): Promise<IFileManager[]> {
        if (entities.length === 0) return [];

        const { columns, bulkValues, bulkPlaceholders } = this.getBulkEntityColumns(entities);
        
        const query = `
            INSERT INTO ${this.tableName} (${columns.join(', ')})
            VALUES ${bulkPlaceholders.join(', ')}
            RETURNING *
        `;

        const result = await this.executeQuery<IFileManager>(query, bulkValues);
        return result.rows as unknown as IFileManager[];
    }

    async bulkUpdate(entities: Partial<IFileManager>[]): Promise<IFileManager[]> {
        if (entities.length === 0) return [];

        const updates = await Promise.all(
            entities.map(entity => {
                if (!entity._id) throw new Error('Entity ID is required for bulk update');
                return this.update(entity._id, entity);
            })
        );

        return updates.filter((entity): entity is IFileManager => entity !== null);
    }

    async bulkDelete(ids: string[]): Promise<number> {
        if (ids.length === 0) return 0;

        const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
        const result = await this.executeQuery<IFileManager>(
            `DELETE FROM ${this.tableName} WHERE _id IN (${placeholders})`,
            ids
        );
        return result.rowCount as number;
    }

    async findByFileKey(fileKey: string): Promise<IFileManager | null> {
        const result = await this.executeQuery<IFileManager>(
            `SELECT * FROM ${this.tableName} WHERE file_key = $1`,
            [fileKey]
        );
        return result.rows[0] as unknown as IFileManager || null;
    }

    async findByUserId(userId: string): Promise<IFileManager[]> {
        const result = await this.executeQuery<IFileManager>(
            `SELECT * FROM ${this.tableName} WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        return result.rows as unknown as IFileManager[];
    }

    async findByPurpose(purpose: string): Promise<IFileManager[]> {
        const result = await this.executeQuery<IFileManager>(
            `SELECT * FROM ${this.tableName} WHERE upload_purpose = $1 ORDER BY created_at DESC`,
            [purpose]
        );
        return result.rows as unknown as IFileManager[];
    }

    private getBulkEntityColumns(entities: IFileManager[]): {
        columns: string[];
        bulkValues: any[];
        bulkPlaceholders: string[];
    } {
        const firstEntity = entities[0];
        const { columns } = this.getEntityColumns(firstEntity);
        
        const bulkValues: any[] = [];
        const bulkPlaceholders: string[] = [];
        
        entities.forEach((entity, entityIndex) => {
            const { values } = this.getEntityColumns(entity);
            bulkValues.push(...values);
            
            const entityPlaceholders = columns.map((_, columnIndex) => 
                `$${entityIndex * columns.length + columnIndex + 1}`
            );
            bulkPlaceholders.push(`(${entityPlaceholders.join(', ')})`);
        });

        return { columns, bulkValues, bulkPlaceholders };
    }

    async update(_id: string, entity: Partial<IFileManager>): Promise<IFileManager | null> {
        try {
            const { setClause, values } = this.buildUpdateSet(entity);
            
            const query = `
                UPDATE ${this.tableName} 
                SET ${setClause} 
                WHERE _id = $${values.length + 1} 
                RETURNING *
            `;

            Console.write('Updating file manager', LogLevel.INFO, { query, values: [...values, _id] });
            const result = await this.executeQuery<any>(
                query,
                [...values, _id]
            );

            if (!result.rows[0]) return null;
            
            // Convert raw DB result to FileManager entity
            const fileManager = new FileManager(result.rows[0] as unknown as Partial<FileManager>);
            return fileManager;
        } catch (error: any) {
            Console.write('Error updating file manager', LogLevel.ERROR, { 
                error: error.message, 
                stack: error.stack,
                _id,
                entity
            });
            throw new Error(`Failed to update file manager: ${error.message}`);
        }
    }
    delete(_id: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
}
