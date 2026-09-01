import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb-client";
import { connectDB } from "@/lib/mongoose";
import { seedDefaultRoutines } from "@/lib/seed";
import authConfig from "@/lib/auth.config";
import User from "@/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  // Credentials only runs in the Node runtime (this file, via the API route
  // handlers) — it needs bcrypt + Mongoose, neither of which is Edge-safe.
  // auth.config.ts (the Edge-safe config middleware uses) intentionally
  // stays Google-only; middleware never calls authorize(), it only reads
  // the session JWT, so it doesn't need this provider.
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        await connectDB();
        const user = await User.findOne({ email });
        // No passwordHash means this is a Google-only account — credentials
        // login must not be able to authenticate into it.
        if (!user?.passwordHash) {
          console.log("[auth] credentials authorize — no password account for:", email);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          console.log("[auth] credentials authorize — bad password for:", email);
          return null;
        }

        return { id: user._id.toString(), email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      console.log("[auth] jwt callback — user:", user?.id, "token sub:", token?.sub);
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      console.log("[auth] session callback — token:", token?.id, "session:", session?.user?.email);
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log("[auth] signIn event — user:", user?.email, "provider:", account?.provider, "isNewUser:", isNewUser);
    },
    async createUser({ user }) {
      console.log("[auth] createUser event — user:", user?.id, user?.email);
      await connectDB();
      await seedDefaultRoutines(user.id!);
    },
    async session({ session }) {
      console.log("[auth] session event — email:", session?.user?.email);
    },
  },
});
