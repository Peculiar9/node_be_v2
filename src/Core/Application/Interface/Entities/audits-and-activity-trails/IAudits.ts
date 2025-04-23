export interface IAudit {
    _id: number;
    user_id: number; // indexed, foreign key to users table
    // station_id?: number; // indexed, foreign key to stations table
    // vehicle_id?: string; // indexed, foreign key to vehicles table
    // trip_id?: number; // indexed, foreign key to trips table
    activity_type: string;
    created_at: string | Date;
    updated_at: string | Date;
}