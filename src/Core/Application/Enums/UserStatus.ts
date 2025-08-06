export enum UserStatus {
    ACTIVE = 'active',
    VERIFIED = 'verified',
    INACTIVE = 'inactive',        // Voluntarily deactivated account
    ARCHIVED = 'archived',        // Long-term inactive account
    DELETED = 'deleted', 
    // ONLINE = 'ONLINE',            // User is currently logged in
    // IDLE = 'IDLE',                // User account is inactive due to inactivity
  
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