import { IsOptional, IsString, IsNumber, IsEnum, Min, Max, IsLatitude, IsLongitude } from 'class-validator';
import { Expose } from 'class-transformer';

export enum StationStatus {
    OPERATIONAL = 'operational',
    UNDER_MAINTENANCE = 'under_maintenance',
    OUT_OF_SERVICE = 'out_of_service'
}

export enum AccessType {
    PUBLIC = 'public',
    PRIVATE = 'private',
    RESTRICTED = 'restricted'
}

export enum ActivationType {
    RFID = 'rfid',
    APP = 'app',
    BOTH = 'both',
    NONE = 'none'
}

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc'
}

@Expose()
export class StationQueryDTO {
    @Expose()
    @IsOptional()
    @IsEnum(StationStatus)
    status?: StationStatus;

    @Expose()
    @IsOptional()
    @IsString()
    state?: string;

    @Expose()
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    page_size?: number = 10;

    @Expose()
    @IsOptional()
    @IsNumber()
    @Min(1)
    page_no?: number = 1;

    @Expose()
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    radius?: number;

    // @Expose()
    // @IsOptional()
    // @IsEnum(AccessType)
    // access?: AccessType;

    // @Expose()
    // @IsOptional()
    // @IsNumber()
    // @Min(1)
    // @Max(5)
    // min_rating?: number;

    // @Expose()
    // @IsOptional()
    // @IsEnum(ActivationType)
    // activation_type?: ActivationType;

    // @Expose()
    // @IsOptional()
    // @IsString()
    // charging_power?: string;

    @Expose()
    @IsOptional()
    @IsString()
    ev_connector_types?: string[];

    @Expose()
    @IsOptional()
    @IsLatitude()
    location_lat?: number;

    @Expose()
    @IsOptional()
    @IsLongitude()
    location_long?: number;

    @Expose()
    @IsOptional()
    @IsString()
    sort_by?: string = 'created_at';

    @Expose()
    @IsOptional()
    @IsEnum(SortOrder)
    sort_order?: SortOrder = SortOrder.DESC;

    @Expose()
    @IsOptional()
    @IsString()
    search?: string;
}
