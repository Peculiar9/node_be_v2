import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export interface PlugTypeDTO {
    name: string;
    plug_type: string;
}

export class VehicleCreationDTO {
    @Expose()
    @IsNotEmpty({ message: 'Model is required' })
    @IsString({ message: 'Model must be a string' })
    model: string;

    @Expose()
    @IsNotEmpty({ message: 'Year is required' })
    @IsString({ message: 'Year must be a string' })
    year: string;

    @Expose()
    @IsNotEmpty({ message: 'Brand is required' })
    @IsString({ message: 'Brand must be a string' })
    brand: string;

    @Expose()
    @IsNotEmpty({ message: 'Plug type is required' })
    @IsString({ message: 'Plug type must be a string' })
    plug_type: string;
}

export class VehicleResponseDTO {
    _id: string;
    user_id: string;
    model: string;
    year: string;
    brand: string;
    plug_type: string;
    created_at: string;
}

export class VehicleUpdateDTO {
    @Expose()
    @IsOptional()
    @IsString({ message: 'Model must be a string' })
    model?: string;

    @Expose()
    @IsOptional()
    @IsString({ message: 'Year must be a string' })
    year?: string;

    @Expose()
    @IsOptional()
    @IsString({ message: 'Brand must be a string' })
    brand?: string;

    @Expose()
    @IsOptional()
    @IsString({ message: 'Plug type must be a string' })
    plug_type?: string;
}