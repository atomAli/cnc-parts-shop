import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phone: { label: "تلفن", type: "text" },
        password: { label: "رمز عبور", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          throw new Error("تلفن و رمز عبور الزامی است");
        }

        try {
          const { default: prisma } = await import("@/lib/prisma");
          const bcrypt = await import("bcryptjs");

          const user = await prisma.user.findUnique({
            where: { phone: credentials.phone },
          });

          if (!user) {
            throw new Error("کاربری با این شماره تلفن یافت نشد");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("رمز عبور اشتباه است");
          }

          return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
          };
        } catch (error: any) {
          if (error.message?.includes("does not exist")) {
            throw new Error("دیتابیس متصل نیست. لطفاً ابتدا دیتابیس را راه‌اندازی کنید.");
          }
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
