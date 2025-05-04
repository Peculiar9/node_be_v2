import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDTO {
    @IsNotEmpty()
    @IsString()
    station_id: string;

    @IsNotEmpty()
    @IsString()
    user_id: string;

    @IsNotEmpty()
    @IsString()
    comment: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;
}

export class CreateRatingsDTO {
    @IsNotEmpty()
    @IsString()
    review_id: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;

    
    @IsOptional()
    @IsNumber()
    cleanliness?: number;

    @IsOptional()
    @IsNumber()
    maintenance?: number;

    @IsOptional()
    @IsNumber()
    convenience?: number;

    @IsOptional()
    @IsNumber()
    accuracy?: number;

    @IsOptional()
    @IsNumber()
    timeliness?: number;

    @IsOptional()
    @IsNumber()
    vehicle_care?: number;

    @IsOptional()
    @IsNumber()
    rule_adherence?: number;

    @IsOptional()
    @IsNumber()
    communication?: number;  
}

export class ReviewResponseDTO {
    _id: string;
    station_id: string;
    user_id: string;
    comment: string;
    rating: number;
    ratings: any; // TODO: Define Ratings interface // ratings for the rest of the other types of ratings
    created_at: Date;
    updated_at: Date;
}
