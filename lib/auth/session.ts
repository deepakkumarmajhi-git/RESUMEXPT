import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/models/User";

export class UnauthorizedSessionError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedSessionError";
  }
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

async function hydrateSessionUserId(session: Session | null) {
  if (!session?.user || session.user.id) {
    return session;
  }

  const normalizedEmail = normalizeEmail(session.user.email);
  if (!normalizedEmail) {
    return session;
  }

  await connectToDatabase();

  const user = await UserModel.findOne({ email: normalizedEmail })
    .select("_id role targetRole")
    .lean();

  if (!user) {
    return session;
  }

  session.user.id = user._id.toString();

  if (!session.user.role && typeof user.role === "string") {
    session.user.role = user.role;
  }

  if (!session.user.targetRole && typeof user.targetRole === "string") {
    session.user.targetRole = user.targetRole;
  }

  return session;
}

export async function getCurrentSession() {
  const session = await getServerSession(authOptions);
  return hydrateSessionUserId(session);
}

export async function requireUserSession() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    throw new UnauthorizedSessionError();
  }

  return session.user;
}

export function isUnauthorizedSessionError(error: unknown) {
  return (
    error instanceof UnauthorizedSessionError ||
    (error instanceof Error && error.message === "Unauthorized")
  );
}
