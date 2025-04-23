import { UserRole } from '../Enums/UserRole';

export interface BaseUserDTO {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  profile_image?: string;
  provider?: string;
  provider_id?: string;
  provider_token?: string;
  dob?: string;
  address?: string;
}

export interface CreateUserDTO extends BaseUserDTO {
  roles: UserRole[];
}

export interface UpdateUserDTO extends Partial<BaseUserDTO> {
  is_active?: boolean;
  status?: string;
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
}

export interface OAuthDTO {
  code: string,
  state: string
}