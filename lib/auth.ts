import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb-client";
import { connectDB } from "@/lib/mongoose";
import { seedDefaultRoutines } from "@/lib/seed";
import authConfig from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
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
