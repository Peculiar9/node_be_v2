import { IDriversLicenseData } from "../../Types/KYCTypes";
import { IUserKYC } from "../Entities/auth-and-user/IVerification";

export interface IKYCUseCase {
  /**
   * Checks the user's current KYC status or initializes it if it doesn't exist.
   * This is the entry point for a user starting or resuming the KYC process.
   * @param userId The ID of the authenticated user.
   * @returns The user's current KYC progress record.
   */
  checkOrInitializeKYC(userId: string): Promise<IUserKYC>;

  /**
   * Stage: FACE_UPLOAD
   * Generates secure upload URLs for the required face images (e.g., front, side).
   * @param userId The ID of the user.
   * @returns An object containing pre-signed URLs for the client to upload images to.
   */
  getFaceImageUploadUrls(userId: string): Promise<{ frontFace: { uploadUrl: string; key: string }; sideFace: { uploadUrl: string; key: string } }>;

  /**
   * Stage: FACE_UPLOAD (Verification)
   * Processes the uploaded face images, performs quality checks, and advances the user to the next stage.
   * @param userId The ID of the user.
   * @param frontFaceKey The S3 key for the uploaded front-facing image.
   * @param sideFaceKey The S3 key for the uploaded side-facing image.
   * @returns The updated KYC progress record.
   */
  submitFaceImages(userId: string, frontFaceKey: string, sideFaceKey: string): Promise<IUserKYC>;

  /**
   * Stage: LICENSE_UPLOAD
   * Generates a secure upload URL for the driver's license.
   * @param userId The ID of the user.
   * @returns An object containing the pre-signed URL for the license upload.
   */
  getLicenseUploadUrl(userId: string): Promise<{ uploadUrl: string; key: string }>;

  /**
   * Stages: LICENSE_UPLOAD, FACE_COMPARISON, DETAILS_VERIFICATION (Verification)
   * Processes the uploaded license, extracts text, compares the license photo with the user's selfie,
   * and verifies the extracted details against the user's profile information.
   * @param userId The ID of the user.
   * @param licenseKey The S3 key for the uploaded driver's license image.
   * @returns The updated KYC progress record.
   */
  submitLicenseAndPerformVerifications(userId: string, licenseKey: string): Promise<IUserKYC>;

  /**
   * Stage: PAYMENT_METHOD
   * Handles the addition of a payment method after all identity verifications are complete.
   * @param userId The ID of the user.
   * @param paymentToken A token from your payment provider (e.g., Stripe's payment_method_id).
   * @returns The final, completed KYC record.
   */
  addPaymentMethod(userId: string, paymentToken: string): Promise<IUserKYC>;
}