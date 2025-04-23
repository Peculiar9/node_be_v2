import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBookmarkDTO {
    @IsNotEmpty()
    @IsString({ message: 'Station ID must be a string' })
    station_id: string;

    @IsNotEmpty()
    @IsString({ message: 'User ID must be a string' })
    user_id: string;
}

export class BookmarkResponseDTO {
    _id: string;
    station_id: string;
    user_id: string;
    created_at: string | Date;
    updated_at: string | Date;
}
