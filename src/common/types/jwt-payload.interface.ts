export interface JwtPayload {
  sub: number;
  email: string;
  name?: string;
  role?: number;
  iat?: number;
  exp?: number;
}