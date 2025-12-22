import { inject, injectable } from "inversify";
import { BaseRepository } from "../BaseRepository";
import { TransactionManager } from "../Abstractions/TransactionManager";
import { TYPES } from "../../../../Core/Types/Constants";
import { TableNames } from "../../../../Core/Application/Enums/TableNames";
import { UserKYC } from "../../../../Core/Application/Entities/UserKYC";
import { KYCStage, KYCStatus } from "../../../../Core/Application/Interface/Entities/auth-and-user/IVerification";
import { IRepository } from "../../../../Core/Application/Interface/Persistence/Repository/IRepository";

@injectable()
export class UserKYCRepository extends BaseRepository<UserKYC> implements IRepository<UserKYC> {
  
    constructor(
        @inject(TYPES.TransactionManager) transactionManager: TransactionManager
    ) {
        super(transactionManager, TableNames.USER_KYC);
    }
    
    async findById(id: string): Promise<UserKYC | null> {
        const result = await this.executeQuery<UserKYC>(
          `SELECT * FROM ${this.tableName}WHERE _id = $1`,
          [id]
      );
         return result.rows[0] as unknown as UserKYC;
    }

      async findAll(): Promise<UserKYC[]> {
        const result = await this.executeQuery<UserKYC>(
          `SELECT * FROM ${this.tableName} ORDER BY last_updated DESC`
        );
        return result.rows as unknown as UserKYC[];
      }
    
      async findByCondition(condition: Partial<UserKYC>): Promise<UserKYC[]> {
        const { whereClause, values } = this.buildWhereClause(condition);
        const result = await this.executeQuery<UserKYC>(
          `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY last_updated DESC`,
          values
        );
        return result.rows as unknown as UserKYC[];
      }
    
      async create(entity: Partial<UserKYC>): Promise<UserKYC> {
        const { columns, values, placeholders } = this.getEntityColumns(entity);
        const result = await this.executeQuery<UserKYC>(
          `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
          values
        );
        return result.rows[0] as unknown as UserKYC;
      }
    
      async update(id: string, entity: Partial<UserKYC>): Promise<UserKYC | null> {
        const { setClause, values } = this.buildUpdateSet(entity);
        const result = await this.executeQuery<UserKYC>(
          `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
          [...values, id]
        );
        return result.rows[0] as unknown as UserKYC || null;
      }
    
      async delete(id: string): Promise<boolean> {
        const result = await this.executeQuery(
          `DELETE FROM ${this.tableName} WHERE id = $1`,
          [id]
        );
        return result.rowCount as number > 0;
      }
    
      async executeRawQuery(query: string, params: any[]): Promise<any> {
        return this.executeQuery(query, params);
      }
    
      async count(condition?: Partial<UserKYC>): Promise<number> {
        let whereClause = '';
        let values: any[] = [];
        if (condition) {
          const built = this.buildWhereClause(condition);
          whereClause = built.whereClause;
          values = built.values;
        }
        const result = await this.executeQuery<{ count: string }>(
          `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`,
          values
        );
        return parseInt((result.rows[0] as any).count || '0', 10);
      }
    
      async bulkCreate(entities: UserKYC[]): Promise<UserKYC[]> {
        if (!entities.length) return [];
        const { valuesClause, values, columns } = this.buildBulkInsertClause(entities);
        const result = await this.executeQuery<UserKYC>(
          `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES ${valuesClause} RETURNING *`,
          values
        );
        return result.rows as unknown as UserKYC[];
      }
    
      async bulkUpdate(entities: Partial<UserKYC>[]): Promise<UserKYC[]> {
        if (!entities.length) return [];
        const { updateClause, values } = this.buildBulkUpdateClause(entities);
        const result = await this.executeQuery<UserKYC>(
          `UPDATE ${this.tableName} SET ${updateClause} RETURNING *`,
          values
        );
        return result.rows as unknown as UserKYC[];
      }
    
      async bulkDelete(ids: string[]): Promise<number> {
        if (!ids.length) return 0;
        const { whereClause, values } = this.buildWhereInClause(ids);
        const result = await this.executeQuery(
          `DELETE FROM ${this.tableName} ${whereClause}`,
          values
        );
        return result.rowCount as number || 0;
      }
    

  async findByUserId(userId: string): Promise<UserKYC | null> {
    const result = await this.executeQuery<UserKYC>(
      `SELECT * FROM ${this.tableName} WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] as unknown as UserKYC || null;
  }

  async updateStage(userId: string, stage: KYCStage, status: KYCStatus, metadata?: Record<string, any>): Promise<UserKYC | null> {
    const result = await this.executeQuery<UserKYC>(
      `UPDATE ${this.tableName}
       SET current_stage = $1, status = $2, last_updated = NOW(), stage_metadata = COALESCE($3, stage_metadata)
       WHERE user_id = $4
       RETURNING *`,
      [stage, status, metadata ? JSON.stringify(metadata) : null, userId]
    );
    return result.rows[0] as unknown as UserKYC || null;
  }

  async setFailure(userId: string, reason: string): Promise<UserKYC | null> {
    const result = await this.executeQuery<UserKYC>(
      `UPDATE ${this.tableName}
       SET status = $1, failure_reason = $2, last_updated = NOW()
       WHERE user_id = $3
       RETURNING *`,
      [KYCStatus.FAILED, reason, userId]
    );
    return result.rows[0] as unknown as UserKYC || null;
  }

  async resetKYC(userId: string): Promise<UserKYC | null> {
    const result = await this.executeQuery<UserKYC>(
      `UPDATE ${this.tableName}
       SET current_stage = $1, status = $2, last_updated = NOW(), failure_reason = NULL, stage_metadata = '{}'::jsonb
       WHERE user_id = $3
       RETURNING *`,
      [KYCStage.FACE_UPLOAD, KYCStatus.PENDING, userId]
    );
    return result.rows[0] as unknown as UserKYC || null;
  }

  async createOrUpdate(userId: string, initialStage: KYCStage = KYCStage.FACE_UPLOAD): Promise<UserKYC> {
    // Upsert logic: insert if not exists, else return existing
    const result = await this.executeQuery<UserKYC>(
      `INSERT INTO ${this.tableName} (user_id, current_stage, status, last_updated, stage_metadata)
       VALUES ($1, $2, $3, NOW(), '{}'::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET last_updated = NOW()
       RETURNING *`,
      [userId, initialStage, KYCStatus.PENDING]
    );
    return result.rows[0] as unknown as UserKYC;
  }
}