"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { seedDefaultRoutines } from "@/lib/seed";
import User from "@/models/User";

type ActionResult = { error: string } | void;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUpAction(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/welcome");

  if (!name || !email || !password) {
    return { error: "Name, email, and password are all required." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    return { error: "An account with that email already exists. Try signing in instead." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let userId: string;
  try {
    const user = await User.create({ name, email, passwordHash, emailVerified: null, image: null });
    userId = user._id.toString();
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return { error: "An account with that email already exists. Try signing in instead." };
    }
    throw err;
  }

  await seedDefaultRoutines(userId);

  await signInWithCredentials(email, password, redirectTo);
}

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/routines");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  return signInWithCredentials(email, password, redirectTo);
}

async function signInWithCredentials(
  email: string,
  password: string,
  redirectTo: string
): Promise<ActionResult> {
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    // Not an auth error — e.g. the NEXT_REDIRECT thrown by a successful
    // signIn() — let it propagate so the redirect actually happens.
    throw error;
  }
}
