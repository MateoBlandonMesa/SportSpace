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
