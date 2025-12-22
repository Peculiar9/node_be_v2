/**
 * Represents the data extracted from a driver's license.
 */
export interface IDriversLicenseData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  licenseNumber: string;
  expiryDate: string;
  issuingState: string;
  address?: string;
  licenseClass?: string;
  restrictions?: string;
  endorsements?: string;
  issueDate?: string;
  documentId?: string;
  confidenceScore: number;
}

/**
 * Represents the result of a KYC verification process.
 */
export interface IKYCVerificationResult {
  success: boolean;
  data?: IDriversLicenseData;
  errorMessage?: string;
  verifiedAt: Date;
  userId: string;
}

export enum DocumentType {
  DRIVERS_LICENSE = 'drivers-license',
  STATE_ID = 'state-id',
  PASSPORT = 'passport',
  CAR_IMAGE = 'car-image'
}

export interface IDetectedLabel {
  name: string;
  confidence: number;
}

export interface IVehicleImageData {
  isValidVehicle: boolean;
  vehicleType: string;
  confidence: number;
  detectedLabels: IDetectedLabel[];
  color: string;
  make: string;
  model: string;
  additionalAttributes: Record<string, number>;
}

export enum VehicleType {
  CAR = 'car',
  TRUCK = 'truck',
  VAN = 'van',
  MOTORCYCLE = 'motorcycle',
  BICYCLE = 'bicycle'
}
