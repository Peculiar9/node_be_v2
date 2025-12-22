import { DocumentType } from "../../../Enums/DocumentEnums";

export interface IDocument {
    _id?: string | null | undefined;
    owner_id: string; // Foreign key to IInstaller.id, IDealer.id, or IUser.id
    owner_type: 'installer' | 'dealer' | 'user';
    document_type: DocumentType;
    document_number?: string; // For identity documents (e.g., ID number, registration number)
    file_name: string;
    file_url: string;
    file_size: number;
    mime_type: string;
    submission_date?: string;
    uploaded_at?: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'pending_review';
    priority?: 'high' | 'medium' | 'low';
    reviewer_id?: string | null | undefined; // Foreign key to IUser.id (admin/operator)
    review_date?: string | null | undefined;
    reviewer_notes?: string | null | undefined;
    submission_notes?: string | null | undefined;
    created_at: string;
    updated_at: string;
    __v?: number | null | undefined;
}