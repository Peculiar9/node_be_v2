export interface ITraining {
    _id?: string | null | undefined;
    title: string;
    description: string;
    type: 'webinar' | 'workshop' | 'field_training' | 'certification_course';
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    start_date: string;
    end_date?: string;
    location?: string;
    capacity: number;
    registered_count: number;
    instructor: string; // Foreign key to IUser.id (could be admin/operator or external)
   
    participants?:string[];
    materials?:string[];
    created_by: string; // Foreign key to IUser.id (admin/operator)
    created_at: string;
    updated_at: string;
    __v?: number | null | undefined;
}