import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { loginSchema } from "@/lib/validations";
import { UserModel } from "@/models/User";

const secureCookie = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name: secureCookie
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: secureCookie,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        await connectToDatabase();

        const user = await UserModel.findOne({
          email: parsed.data.email.toLowerCase(),
        }).select("+passwordHash");

        if (!user?.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!isPasswordValid) {
          return null;
        }

        user.lastLoginAt = new Date();
        await user.save();

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          targetRole: user.targetRole,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if (typeof user.id === "string" && user.id) {
          token.sub = user.id;
        }

        if (typeof user.email === "string" && user.email) {
          token.email = user.email;
        }

        if (typeof user.name === "string" && user.name) {
          token.name = user.name;
        }

        token.role = user.role;
        token.targetRole = user.targetRole;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }

        if (!session.user.email && typeof token.email === "string") {
          session.user.email = token.email;
        }

        if (!session.user.name && typeof token.name === "string") {
          session.user.name = token.name;
        }

        session.user.role = token.role;
        session.user.targetRole =
          typeof token.targetRole === "string" ? token.targetRole : "";
      }

      return session;
    },
  },
};
