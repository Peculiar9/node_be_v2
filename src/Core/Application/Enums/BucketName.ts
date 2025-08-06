const APP_NAME = "gr33nwh33lz";
export enum BucketName {
    DEFAULT = "default",
    IMAGES = `${APP_NAME}-images`,
    EMAIL_TEMPLATE_S3_BUCKET = `${APP_NAME}-email-template`,
    VERIFICATION = `${APP_NAME}-verification`,
    CAR_IMAGES = `${APP_NAME}-car-images`,
    USER_UPLOADS = "user-uploads",
    TEMPORARY_UPLOADS = "temporary-uploads",
    THUMBNAILS = "thumbnails",
    MEDIA_ARCHIVE = `${APP_NAME}-media-archives`,
    PROFILE_PICTURES = "profile-pictures",
    DOCUMENTS = "documents",
    INVOICE_PDFS = "invoice-pdfs",
    MARKETPLACE_PRODUCT_IMAGES = "marketplace-product-images",
    MARKETPLACE_PRODUCT_THUMBNAILS = "marketplace-product-thumbnails",
} 