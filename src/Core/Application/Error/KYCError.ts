import { AppError } from './AppError';

export class KYCError extends AppError {
  constructor(message: string, errorCode?: number) {
    super(message, 422, errorCode || 800); // KYC errors: 800-899
    this.name = 'KYCError';
  }
}

export class DocumentValidationError extends KYCError {
  constructor(message: string) {
    super(message, 801);
    this.name = 'DocumentValidationError';
  }
}

export class DocumentExpiryError extends KYCError {
  constructor(message: string) {
    super(message, 802);
    this.name = 'DocumentExpiryError';
  }
}

export class DocumentDataMismatchError extends KYCError {
  constructor(message: string) {
    super(message, 803);
    this.name = 'DocumentDataMismatchError';
  }
}

export class ImageProcessingError extends KYCError {
  constructor(message: string) {
    super(message, 804);
    this.name = 'ImageProcessingError';
  }
}
