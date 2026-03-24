import { hash } from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api";
import { signupSchema } from "@/lib/validations";
import { UserModel } from "@/models/User";
import { UserPreferencesModel } from "@/models/UserPreferences";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid signup payload.", 422, parsed.error.flatten());
    }

    await connectToDatabase();

    const existingUser = await UserModel.findOne({
      email: parsed.data.email.toLowerCase(),
    });

    if (existingUser) {
      return errorResponse("An account with this email already exists.", 409);
    }

    const passwordHash = await hash(parsed.data.password, 12);

    const user = await UserModel.create({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
    });

    await UserPreferencesModel.create({
      userId: user._id,
    });

    return successResponse(
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup failed", error);
    return errorResponse("Unable to create your account right now.", 500);
  }
}
