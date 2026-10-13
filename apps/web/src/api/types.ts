export type Role = 'STUDENT' | 'STAFF' | 'ADMIN';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
};

export type ProfileResponse = {
  user: {
    sub: string;
    email: string;
    role: Role;
  };
};

export type HealthResponse = {
  status: string;
};

export type Space = {
  id: string;
  name: string;
  type: string;
  campus: string;
  capacity: number;
  usageRules: string;
  isActive: boolean;
};
