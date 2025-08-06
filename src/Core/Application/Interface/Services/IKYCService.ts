import { IDriversLicenseData, IVehicleImageData, VehicleType } from "../../../Application/Types/KYCTypes";
import { IUserKYC } from "../Entities/auth-and-user/IVerification";

export interface IKYCService {

  /**
   * Checks if the user has a KYC record, and if not, initializes one.
   * @param userId The ID of the user to check or initialize KYC for.
   * @returns A promise that resolves to the user's KYC record.
   */
  checkOrInitializeKYC(userId: string): Promise<IUserKYC>;

  /**
   * Generates a secure, one-time URL for the client to upload their ID document.
   * @param userId The ID of the user initiating the upload.
   * @returns An object containing the pre-signed URL for the upload and the S3 key.
   */
  getSecureUploadUrl(userId: string): Promise<{ uploadUrl: string; key: string }>;

  /**
   * Processes the uploaded ID document after the client has finished uploading.
   * @param userId The ID of the user whose document was uploaded.
   * @param s3Key The key of the object in the S3 bucket.
   * @returns A promise that resolves with the extracted and verified data.
   */
  processUploadedId(userId: string, s3Key: string): Promise<IDriversLicenseData>;

  /**
   * Validates if an image contains a valid vehicle of the specified type.
   * @param userId The ID of the user who uploaded the image.
   * @param s3Key The key of the object in the S3 bucket.
   * @param expectedVehicleType The expected type of vehicle in the image.
   * @returns A promise that resolves to vehicle image data with detection results.
   */
  validateCarImage(userId: string, s3Key: string, expectedVehicleType?: VehicleType): Promise<IVehicleImageData>;
  
  /**
   * Generates a secure, one-time URL for the client to upload a vehicle image.
   * @param userId The ID of the user initiating the upload.
   * @param vehicleType The type of vehicle being uploaded (car, truck, etc.).
   * @returns An object containing the pre-signed URL for the upload and the S3 key.
   */
  getVehicleImageUploadUrl(userId: string, vehicleType: VehicleType): Promise<{ uploadUrl: string; key: string }>;

  /**
   * Validates if the extracted driver's license data is complete and valid.
   * @param licenseData The extracted driver's license data to validate.
   * @returns A promise that resolves to true if the data is valid, false otherwise.
   */
  validateDriversLicenseData(licenseData: IDriversLicenseData): Promise<boolean>;

  
}
