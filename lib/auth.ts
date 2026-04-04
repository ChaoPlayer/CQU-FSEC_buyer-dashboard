import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "邮箱或学号", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("请输入邮箱/学号和密码");
        }

        const login = credentials.email.trim();
        const isEmail = login.includes('@');

        const user = await prisma.user.findFirst({
          where: isEmail
            ? { email: login }
            : { studentId: login },
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
      if (user) {
        // 初次登录：从 authorize 返回的 user 对象中写入 token
        token.role = (user as any).role;
        token.id = (user as any).id;
      } else if (token.id) {
        // 后续请求：每次从数据库重新读取最新的 role 和 groupId
        // 这样管理员修改角色后，被修改用户下次请求即可生效，无需重新登录
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, groupId: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.groupId = dbUser.groupId ?? null;
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        // 将 groupId 也写入 session，供服务端权限判断使用
        session.user.groupId = (token.groupId as string | null) ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};