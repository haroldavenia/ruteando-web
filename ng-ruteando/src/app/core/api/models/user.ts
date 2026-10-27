import { UserRole } from '../../auth/session.model';

/** Usuario del tenant; los conductores son usuarios con rol `driver`. */
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: UserRole;
  tenantId: string;
  createdAt: string;
  active: boolean;
  identifierType: string | null;
  identifierValue: string | null;
  avatar: string | null;
  lastLoginAt: string | null;
  updatedAt: string | null;
}

export interface UserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string | null;
  identifierType?: string | null;
  identifierValue?: string | null;
}
