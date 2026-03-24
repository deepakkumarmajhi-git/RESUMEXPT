import { errorResponse, successResponse } from "@/lib/api";
import { requireUserSession } from "@/lib/auth/session";
import { getHistorySnapshot } from "@/services/dashboard.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUserSession();
    const history = await getHistorySnapshot(user.id);
    return successResponse(history);
  } catch (error) {
    console.error("History fetch failed", error);
    return errorResponse("Unable to load history.", 500);
  }
}
