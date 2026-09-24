export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface MeResponse extends PublicUser {
  createdAt: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  /** Raw refresh token — only ever placed in the httpOnly cookie, never in a JSON body. */
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}
