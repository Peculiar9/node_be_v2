import { inject, injectable } from "inversify";
import { IKYCService } from "../../Core/Application/Interface/Services/IKYCService";
import { IDriversLicenseData, IVehicleImageData, VehicleType } from "../../Core/Application/Types/KYCTypes";
import { TYPES } from "../../Core/Types/Constants";
import { UserRepository } from "../../Infrastructure/Repository/SQL/users/UserRepository";
import { RegistrationError, ValidationError } from "../../Core/Application/Error/AppError";
import { DocumentValidationError, DocumentExpiryError, DocumentDataMismatchError, ImageProcessingError } from "../../Core/Application/Error/KYCError";
import { IAWSHelper } from "../../Core/Application/Interface/Services/IAWSHelper";
import { BucketName } from "../../Core/Application/Enums/BucketName";
import { v4 as uuidv4 } from 'uuid';
import { IUser } from "../../Core/Application/Interface/Entities/auth-and-user/IUser";
import { BaseService } from "./base/BaseService";
import { TransactionManager } from "../Repository/SQL/Abstractions/TransactionManager";
import { IUserKYC, KYCStatus, KYCStage } from "../../Core/Application/Interface/Entities/auth-and-user/IVerification";
import { UserKYCRepository } from "../Repository/SQL/auth/UserKYCRepository";

@injectable()
export class KYCService extends BaseService implements IKYCService {
  private readonly kycDirectory: string = 'kyc-documents';
  private readonly carImagesDirectory: string = 'car-images';
  private readonly urlExpirationSeconds: number = 300; // 5 minutes
  private readonly minVehicleConfidence: number = 80.0;
  
  // A more robust list of vehicle labels for Rekognition
  private readonly vehicleLabels: Record<VehicleType, string[]> = {
    [VehicleType.CAR]: ['Car', 'Automobile', 'Vehicle', 'Transportation', 'Sports Car', 'Sedan', 'SUV', 'Convertible'],
    [VehicleType.TRUCK]: ['Truck', 'Pickup Truck', 'Lorry'],
    [VehicleType.VAN]: ['Van', 'Minivan', 'Cargo Van'],
    [VehicleType.MOTORCYCLE]: ['Motorcycle', 'Motorbike', 'Scooter'],
    [VehicleType.BICYCLE]: ['Bicycle', 'Bike', 'Cyclist']
  };
  
  constructor(
    @inject(TYPES.UserRepository) private readonly userRepository: UserRepository,
    @inject(TYPES.AWSHelper) private readonly awsHelper: IAWSHelper,
    @inject(TYPES.TransactionManager) protected readonly transactionManager: TransactionManager,
    @inject(TYPES.UserKYCRepository) private readonly userKYCRepository: UserKYCRepository
  ) {
    super(transactionManager);
  }

  async checkOrInitializeKYC(userId: string): Promise<IUserKYC> {
    let transactionSuccessfullyStarted = false;
    try {
          transactionSuccessfullyStarted = await this.beginTransaction();
          const userKYC = await this.userKYCRepository.findByUserId(userId);
          if (!userKYC) {
             const user = await this.userRepository.findById(userId);
             if (!user) {
              throw new ValidationError('User not found');
             }
             const newUserKYC: Partial<IUserKYC> = {
              user_id: userId,
              status: KYCStatus.PENDING,
              current_stage: KYCStage.FACE_UPLOAD,
              stage_metadata: {},
             }
             const createdUserKYC = await this.userKYCRepository.create(newUserKYC);
             await this.commitTransaction();
             return createdUserKYC;
          }
          if(userKYC.status === KYCStatus.COMPLETED) {
            throw new RegistrationError("User already completed KYC, proceed to app");
          }
          await this.commitTransaction();
          return userKYC;
    } catch (error) {
      if(transactionSuccessfullyStarted) {
        await this.rollbackTransaction();
      }
      throw error;
    } 
  }

  validateCarImage(userId: string, s3Key: string, expectedVehicleType?: VehicleType): Promise<IVehicleImageData> {
    throw new Error("Method not implemented.");
  }
  validateDriversLicenseData(licenseData: IDriversLicenseData): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  /**
   * Generates a secure URL for a client to upload an ID document.
   */
  public async getSecureUploadUrl(userId: string): Promise<{ uploadUrl: string; key: string }> {
    await this.validateUserExists(userId);
    const key = `${this.kycDirectory}/${userId}/${uuidv4()}`;
    const uploadUrl = await this.awsHelper.generatePresignedUploadUrl(
      BucketName.VERIFICATION,
      key,
      'image/jpeg',
      this.urlExpirationSeconds
    );
    return { uploadUrl, key };
  }

  /**
   * Processes an uploaded ID document using AWS Rekognition.
   */
  public async processUploadedId(userId: string, s3Key: string): Promise<IDriversLicenseData> {
    const user = await this.validateUserExists(userId);
    this.validateKeyOwnership(userId, s3Key, this.kycDirectory);
    try {
      const textDetections = await this.awsHelper.extractDocumentText(s3Key);
      if (!textDetections || textDetections.length === 0) {
        throw new DocumentValidationError('No text could be extracted. Please upload a clearer image.');
      }
      const licenseData = this.parseDriversLicenseData(textDetections);
      this.validateExtractedLicenseData(licenseData);
      this.verifyLicenseDataMatchesUser(user, licenseData);
      return licenseData;
    } catch (error) {
      console.error(`Error processing ID for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error) throw error;
      throw new ImageProcessingError('Failed to process the provided ID document.');
    } finally {
      await this.awsHelper.deleteFile(BucketName.VERIFICATION, s3Key);
    }
  }

  /**
   * Generates a secure URL for a client to upload a vehicle image.
   */
  public async getVehicleImageUploadUrl(userId: string, vehicleType: VehicleType): Promise<{ uploadUrl: string; key: string }> {
    await this.validateUserExists(userId);
    const key = `${this.carImagesDirectory}/${userId}/${vehicleType.toLowerCase()}/${uuidv4()}`;
    const uploadUrl = await this.awsHelper.generatePresignedUploadUrl(
      BucketName.VERIFICATION,
      key,
      'image/jpeg',
      this.urlExpirationSeconds
    );
    return { uploadUrl, key };
  }

  /**
   * Validates if an uploaded image contains the expected vehicle type.
   */
  public async validateVehicleImage(userId: string, s3Key: string, expectedVehicleType: VehicleType): Promise<IVehicleImageData> {
    await this.validateUserExists(userId);
    this.validateKeyOwnership(userId, s3Key, this.carImagesDirectory);
    try {
      const isValid = await this.awsHelper.detectImageObject(s3Key, this.vehicleLabels[expectedVehicleType]);
      if (!isValid) {
        throw new ImageProcessingError('The uploaded image does not appear to contain a valid vehicle.');
      }
      return {
        isValidVehicle: true,
        vehicleType: expectedVehicleType,
        confidence: this.minVehicleConfidence,
        detectedLabels: this.vehicleLabels[expectedVehicleType].map(label => ({ name: label, confidence: this.minVehicleConfidence })),
        color: '',
        make: '',
        model: '',
        additionalAttributes: {},
      };
    } catch (error) {
      console.error(`Error validating vehicle image for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new ImageProcessingError('Failed to validate the vehicle image.');
    }
  }

  // =================================================================
  // PRIVATE HELPER METHODS
  // =================================================================

  private async validateUserExists(userId: string): Promise<IUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError('User not found');
    }
    return user;
  }

  private validateKeyOwnership(userId: string, key: string, directory: string): void {
    if (!key.startsWith(`${directory}/${userId}/`)) {
      throw new ValidationError('Invalid document key for this user.');
    }
  }

  /**
   * A more robust parser for driver's license data.
   * This logic is highly dependent on the license format and may need adjustment.
   */
  private parseDriversLicenseData(textDetections: any[]): IDriversLicenseData {
    const textMap = new Map<string, string>();
    textDetections.forEach(d => {
      if (d.Id && d.ParentId && d.DetectedText) {
        textMap.set(String(d.Id), d.DetectedText);
      }
    });
    // This is a placeholder for a more sophisticated parsing logic.
    // Real-world parsing requires complex logic, regex, and possibly state-specific templates.
    // For this example, we'll assume a very basic structure.
    const licenseData: IDriversLicenseData = {
      firstName: this.findValueForKey(textMap, ['FIRST', 'GIVEN NAME']),
      lastName: this.findValueForKey(textMap, ['LAST', 'SURNAME']),
      dateOfBirth: this.findValueForKey(textMap, ['DOB']),
      licenseNumber: this.findValueForKey(textMap, ['DLN', 'LICENSE NO']),
      expiryDate: '',
      issuingState: '',
      confidenceScore: 100
    };
    return licenseData;
  }

  // Helper for the parser to find a value associated with a keyword
  private findValueForKey(textMap: Map<string, string>, keywords: string[]): string {
    // This is a simplified example. A real implementation would need more advanced logic
    // to find text that is physically close to the keyword on the document.
    for (const [id, text] of textMap.entries()) {
        for (const keyword of keywords) {
            if (text.toUpperCase().includes(keyword)) {
                // A very naive assumption that the value is the next detected block of text
                const nextId = (parseInt(id) + 1).toString();
                return textMap.get(nextId) || '';
            }
        }
    }
    return '';
  }

  private validateExtractedLicenseData(data: IDriversLicenseData): void {
    if (!data.firstName || !data.lastName || !data.dateOfBirth || !data.licenseNumber) {
      throw new DocumentValidationError('Could not extract all required fields from the document. Please try again with a clearer image.');
    }
    // Optionally, add expiry validation if your IDriversLicenseData supports it
  }

  private verifyLicenseDataMatchesUser(user: IUser, licenseData: IDriversLicenseData): void {
    // Compare extracted names with user's registered name (case-insensitive)
    const firstNameMatch = user.first_name.toLowerCase() === licenseData.firstName.toLowerCase();
    const lastNameMatch = user.last_name.toLowerCase() === licenseData.lastName.toLowerCase();

    if (!firstNameMatch || !lastNameMatch) {
      throw new DocumentDataMismatchError('The name on the driver\'s license does not match the registered user.');
    }
    // You could add a similar check for Date of Birth if you store that on your user model.
  }

  private processVehicleLabels(labels: any[]): IVehicleImageData {
    const result: IVehicleImageData = {
      isValidVehicle: false,
      vehicleType: '',
      confidence: 0,
      detectedLabels: [],
      color: '',
      make: '',
      model: '',
      additionalAttributes: {},
    };
    let highestConfidence = 0;
    let detectedType: VehicleType | '' = '';
    for (const label of labels) {
      for (const [vehicleType, validLabels] of Object.entries(this.vehicleLabels)) {
        if (label.Name && validLabels.includes(label.Name) && label.Confidence && label.Confidence > highestConfidence) {
          highestConfidence = label.Confidence;
          detectedType = vehicleType as VehicleType;
        }
      }
      if (label.Name && label.Confidence) {
        result.detectedLabels.push({ name: label.Name, confidence: label.Confidence });
      }
    }
    if (detectedType && highestConfidence >= this.minVehicleConfidence) {
      result.isValidVehicle = true;
      result.vehicleType = detectedType;
      result.confidence = highestConfidence;
    }
    return result;
  }
}