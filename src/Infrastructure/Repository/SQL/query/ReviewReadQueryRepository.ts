import { TYPES } from "../../../../Core/Types/Constants";
import { inject } from "inversify";
import { TransactionManager } from "../Abstractions/TransactionManager";
import { DatabaseIsolationLevel } from "../../../../Core/Application/Enums/DatabaseIsolationLevel";
import { DatabaseError } from "../../../../Core/Application/Error/AppError";
import { ReviewResponseDTO } from "../../../../Core/Application/DTOs/ReviewDTO";

export class ReviewReadQueryRepository {
    constructor(
        @inject(TYPES.TransactionManager) private readonly transactionManager: TransactionManager,
    ) { }

    public async findStationReviewAggregate(stationId: string): Promise<ReviewResponseDTO[]> {
       try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.REPEATABLE_READ
            })
            const result = await this.transactionManager.getClient().query(`
                SELECT 
                     r._id,
                     r.review_type,
                     r.station_id,
                     r.user_id,
                     r.comment,
                     r.created_at,
                     r.updated_at,
                     rt.rating,
                     rt.cleanliness,
                     rt.maintenance,
                     rt.convenience,
                     rt.accuracy,
                     rt.timeliness,
                     rt.vehicle_care,
                     rt.rule_adherence,
                     rt.communication
                FROM reviews AS r
                JOIN ratings AS rt ON r._id = rt.review_id
                WHERE r.station_id = $1
                `,   
                [stationId]);
            await this.transactionManager.commit();
            return result.rows;
       } catch (error: any) {
            await this.transactionManager.rollback();
            throw new DatabaseError(`Failed to get reviews: ${error.message}`);
       }

    }

    public async getReviewCount(stationId: string): Promise<number> {
        try {
            await this.transactionManager.beginTransaction({
                isolationLevel: DatabaseIsolationLevel.REPEATABLE_READ
            })
            const result = await this.transactionManager.getClient().query(`
                SELECT COUNT(*)
                FROM reviews
                WHERE station_id = $1
                `, [stationId]);
            await this.transactionManager.commit();
            return result.rows[0].count;
        } catch (error: any) {
            await this.transactionManager.rollback();
            throw new DatabaseError(`Failed to get review count: ${error.message}`);
        }
    }

}