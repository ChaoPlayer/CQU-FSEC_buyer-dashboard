import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("请输入邮箱和密码");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("用户不存在");
        }

        if (!user.password) {
          throw new Error("该账号未设置密码，请使用其他登录方式");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("密码错误");
        }

        console.log('认证成功，用户ID:', user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.realName,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      console.log('jwt回调 user:', user);
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
        console.log('设置 token id:', token.id);
      }
      return token;
    },
    async session({ session, token }: any) {
      console.log('session回调 token:', token);
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        console.log('设置 session user id:', session.user.id);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};