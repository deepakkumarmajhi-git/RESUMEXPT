import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: string;
      targetRole?: string;
    };
  }

  interface User {
    id?: string;
    role?: string;
    targetRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    targetRole?: string;
  }
}
