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

export type SlotStatus = 'FREE' | 'BUSY' | 'BLOCKED' | 'PAST';

export type AvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  status: SlotStatus;
  bookable: boolean;
  reason?: string;
};

export type AvailabilityDay = {
  spaceId: string;
  spaceName: string;
  date: string;
  timeZone: string;
  slotMinutes: number;
  slots: AvailabilitySlot[];
};

export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type Reservation = {
  id: string;
  spaceId: string;
  userId: string;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
  reason: string | null;
  createdAt: string;
  space: {
    id: string;
    name: string;
    type: string;
    campus: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

export type OccupancySpace = {
  spaceId: string;
  name: string;
  type: string;
  campus: string;
  isActive: boolean;
  enabledHours: number;
  occupiedHours: number;
  blockedHours: number;
  occupancyPercent: number;
};

export type OccupancyWeek = {
  weekStart: string;
  weekEnd: string;
  timeZone: string;
  slotMinutes: number;
  spaces: OccupancySpace[];
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
