import JWT from 'jsonwebtoken';

type Role = 'user';

interface AuthClaims {
  iat: number;
  iss: string;
  exp: number;
  role: Role;
  sub: string;
}

export class Auth {
  private token: string;
  private PREFIX = 'Bearer ';
  private claims: AuthClaims | null = null;
  private hasVerified = false;

  constructor(authHeader: string | undefined) {
    if (authHeader) {
      this.token = authHeader.startsWith(this.PREFIX)
        ? authHeader.substring(this.PREFIX.length)
        : '';
    } else {
      this.token = '';
    }
  }

  get(): AuthClaims | null {
    if (!this.hasVerified) {
      this.verify();
    }

    return this.claims;
  }

  private verify(): void {
    if (!this.token) {
      this.hasVerified = true;
      return;
    }

    try {
      this.claims = JWT.verify(
        this.token,
        process.env.JWT_SECRET_KEY
      ) as AuthClaims;
    } catch (err) {
      this.claims = null;
    }
    this.hasVerified = true;
  }
}
