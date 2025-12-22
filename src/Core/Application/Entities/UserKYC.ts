import { IUserKYC } from "../Interface/Entities/auth-and-user/IVerification";

import { Column, Index, ForeignKey } from "../../../extensions/decorators";
import { KYCStage, KYCStatus } from "../Interface/Entities/auth-and-user/IVerification";

export class UserKYC implements IUserKYC {
  @Column('UUID PRIMARY KEY DEFAULT gen_random_uuid()')
  _id?: string;

  @Index({ unique: true })
  @ForeignKey({ table: "users", field: "_id" })
  @Column('UUID NOT NULL')
  user_id: string;

  @Column('VARCHAR(32) NOT NULL DEFAULT \'FACE_UPLOAD\'')
  current_stage: KYCStage;

  @Column('VARCHAR(16) NOT NULL DEFAULT \'PENDING\'')
  status: KYCStatus;

  @Column('TIMESTAMP NOT NULL DEFAULT NOW()')
  last_updated: Date | string;

  @Column('TEXT')
  failure_reason?: string | null;

  @Column('JSONB DEFAULT \'{}\'')
  stage_metadata: Record<string, any>;

  constructor(data?: Partial<UserKYC>) {
    if (data) Object.assign(this, data);
  }
} 