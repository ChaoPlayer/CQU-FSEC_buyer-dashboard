import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // 如果已登录，跳转到仪表盘；否则跳转到登录页
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }

  // 以下内容不会执行，仅为占位
  return null;
}
