export type UserRole = 'user' | 'admin' | 'moderator';

export type AccountStatus = 'active' | 'suspended' | 'pending_verification' | 'deactivated';

export interface IUser {
  _id: string;
  email: string;
  username: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAuthUser extends IUser {
  accessToken: string;
  refreshToken: string;
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IRegisterPayload {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
