export interface JwtPayload {
  sub: number;
  id: number;
  email: string;
  name?: string;
  role?: number;
  iat?: number;
  exp?: number;
}