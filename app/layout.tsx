import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "采购报销管理系统",
  description: "团队采购报销管理平台",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-gray-50`}>
        <Providers session={session}>
          <Navbar />
          <main className="container mx-auto px-4 py-8">{children}</main>
          <footer className="mt-12 border-t py-6 text-center text-sm text-gray-500">
            © 2026 采购报销管理系统 - 内部使用
          </footer>
        </Providers>
      </body>
    </html>
  );
}
