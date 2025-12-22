export interface IBusiness {
    _id?: string;
    installer_id: string;
    business_name: string;
    business_name_slug: string;
    business_type: string;
    years_of_experience: string;
    verification_meta?: Record<string, any>;
    deleted_flag?: string;
    deleted_by?: string;
    business_created_at?: string;
    business_updated_at?: string;
    business_deleted_at?: string;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
}