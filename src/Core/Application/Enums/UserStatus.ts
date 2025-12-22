export enum UserStatus {
    // Registration States
    PENDING_EMAIL_VERIFICATION = 'pending_email_verification',  // Awaiting email verification 
    EMAIL_VERIFIED = 'email_verified',                          // Email verified, ready for onboarding
    
    // Onboarding States
    ONBOARDING_IN_PROGRESS = 'onboarding_in_progress',         // Currently going through onboarding
    ONBOARDING_COMPLETED = 'onboarding_completed',             // Onboarding completed, pending final approval
    
    // Active States
    ACTIVE = 'active',                                          // Fully verified and active
    INACTIVE = 'inactive',                                      // Temporarily inactive
    
    // Restricted States
    SUSPENDED = 'suspended',                                    // Account suspended
    UNDER_REVIEW = 'under_review',                             // Account under administrative review
    REJECTED = 'rejected',                                      // Application rejected
    
    // Administrative States
    ARCHIVED = 'archived',                                      // Long-term inactive account
    DELETED = 'deleted'                                         // Soft-deleted account
  
    // // Verification States
    // PENDING_VERIFICATION = 'PENDING_VERIFICATION', // Awaiting email/phone verification
    // EMAIL_UNVERIFIED = 'EMAIL_UNVERIFIED',         // Email not yet confirmed
    // PHONE_UNVERIFIED = 'PHONE_UNVERIFIED',         // Phone number not yet confirmed
  
    // // Restricted States
    // SUSPENDED = 'SUSPENDED',      // Temporary account restriction
    // BANNED = 'BANNED',            // Permanent account prohibition
    // LOCKED = 'LOCKED',            // Account locked due to multiple failed login attempts
  
    // // Administrative States
    // INACTIVE = 'INACTIVE',        // Voluntarily deactivated account
    // ARCHIVED = 'ARCHIVED',        // Long-term inactive account
    // DELETED = 'DELETED',          // Soft-deleted account (can be restored)
  
    // // Special Access States
    // RESTRICTED = 'RESTRICTED',    // Limited system access
    // REQUIRES_PASSWORD_RESET = 'REQUIRES_PASSWORD_RESET', // Mandatory password change
    
    // // Compliance and Security States
    // UNDER_REVIEW = 'UNDER_REVIEW',  // Account pending administrative review
    // COMPROMISED = 'COMPROMISED'  
}