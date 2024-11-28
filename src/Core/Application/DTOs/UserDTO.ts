import { UserRole } from '../Enums/UserRole';

export interface BaseUserDTO {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  profile_image?: string;
}

export interface CreateUserDTO extends BaseUserDTO {
  roles: UserRole[];
}

export interface UpdateUserDTO extends Partial<BaseUserDTO> {
  isActive?: boolean;
  status?: string;
}

export interface UserResponseDTO {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image?: string;
  roles: UserRole[];
  status: string;
  isActive: boolean;
  created_at: string;
  updated_at: string;
}