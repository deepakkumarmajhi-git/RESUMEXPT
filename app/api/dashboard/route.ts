import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { getDashboardStats } from "@/services/dashboard.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUserSession();
    const stats = await getDashboardStats(user.id);
    return successResponse(stats);
  } catch (error) {
    console.error("Dashboard fetch failed", error);
    return errorResponse("Unable to load dashboard analytics.", 500);
  }
}
