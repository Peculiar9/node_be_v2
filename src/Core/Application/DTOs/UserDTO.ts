import { UserRole } from '../Enums/UserRole';
import { ILocation } from '../Interface/Entities/auth-and-user/IUser';

export interface BaseUserDTO {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  international_phone?: string;
  country_code?: string;
  password: string;
  profile_image?: string;
  provider?: string;
  provider_id?: string;
  provider_token?: string;
  dob?: string;
  gender?: string;
  image?: string;
  address?: ILocation;
}

export interface CreateUserDTO extends BaseUserDTO {
  roles: UserRole[];
}

export interface UpdateUserDTO extends Omit<Partial<BaseUserDTO>, 'address'> {
  is_active?: boolean;
  status?: string;
  location?: ILocation;
}

export interface UserResponseDTO {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  profile_image?: string;
  roles: UserRole[];
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  dob?: string;
  address?: string;
  gender?: string;
  reference?: string | null | undefined;
  expiry?: number | null | undefined;
}

export interface OAuthDTO {
  code: string,
  state: string
}