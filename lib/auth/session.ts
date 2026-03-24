import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireUserSession() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user;
}
