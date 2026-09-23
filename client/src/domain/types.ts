export type Role = 'viewer' | 'editor' | 'admin';
export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  companyId: string;
  role: Role;
  status: 'approved' | 'pending' | 'rejected';
  modifiedAt?: string;
}
export interface Model {
  id: string;
  name: string;
  group: string;
}
export interface Material {
  id: string;
  name: string;
  substance: string;
  spec: string;
  unit: string;
  opening: number;
  bom: { modelId: string; rate: number }[];
  formula: string;
  review: boolean;
  reviewModels?: string[];
  modifiedBy: string;
  modifiedAt: string;
  source?: {
    row: number;
    usage: string;
    plan: string;
    stock: number;
    previous: number;
    loss: number;
    incoming: number;
    used: number;
  };
}
export interface Day {
  source: 'direct' | 'assembly';
  usage: Record<string, number>;
  assembly: Record<string, number>;
  incoming: Record<string, number>;
  loss: Record<string, number>;
}
export interface Database {
  revision: number;
  materials: Material[];
  models: Model[];
  plans: Record<string, Record<string, number>>;
  days: Record<string, Day>;
  users: User[];
}
export interface Filters {
  query: string;
  name: string;
  substance: string;
  model: string;
  spec: string;
  shortage: boolean;
}
export const emptyFilters: Filters = {
  query: '',
  name: '',
  substance: '',
  model: '',
  spec: '',
  shortage: false,
};
export const blankDay = (): Day => ({
  source: 'direct',
  usage: {},
  assembly: {},
  incoming: {},
  loss: {},
});
export const roleLabel: Record<Role, string> = { viewer: '조회', editor: '편집', admin: '관리자' };
