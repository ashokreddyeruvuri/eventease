export type Role = 'admin' | 'organizer' | 'attendee';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  college?: string;
  address?: string;
  photo?: string;
  passwordHash: string;
}

export interface AuthenticatedRequest extends Request {
  user: User;
  token: string;
}
