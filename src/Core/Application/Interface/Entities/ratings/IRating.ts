export interface IRating {
    _id?: string | null | undefined;
    job_id: string;
    installer_id: string;
    customer_id: string;
    customer_name: string;
    overall_rating: number; // 1-5
    criteria_ratings?: IRatingCriteria;
    review_text?: string;
    installer_response?: string;
    installer_response_date?: string;
    is_verified: boolean;
    is_featured: boolean;
    helpful_count: number;
    reported_count: number;
    status: RatingStatus;
    created_at: string;
    updated_at: string;
    __v?: number | null | undefined;
}

export interface IRatingCriteria {
    professionalism: number; // 1-5
    quality_of_work: number; // 1-5
    timeliness: number; // 1-5
    communication: number; // 1-5
    value_for_money: number; // 1-5
}

export enum RatingStatus {
    ACTIVE = 'active',
    HIDDEN = 'hidden',
    FLAGGED = 'flagged',
    REMOVED = 'removed'
}

export interface IRatingStats {
    installer_id: string;
    total_ratings: number;
    average_rating: number;
    rating_distribution: {
        five_star: number;
        four_star: number;
        three_star: number;
        two_star: number;
        one_star: number;
    };
    criteria_averages: {
        professionalism: number;
        quality_of_work: number;
        timeliness: number;
        communication: number;
        value_for_money: number;
    };
    total_jobs_completed: number;
    response_rate: number;
    last_updated: string;
}
