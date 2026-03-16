"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'purchases';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isActive = (path: string) => isMounted && pathname === path;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/30 backdrop-blur-md border-b border-white/40 transition-all">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center gap-3 text-xl font-bold text-indigo-700">
            <img src="/LOGO.jpg" alt="Logo" className="h-8 w-auto" />
            重庆大学方程式赛车队工作平台
          </Link>
          <div className="hidden md:flex space-x-6">
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive("/dashboard")
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              主页
            </Link>
            {(session?.user?.role === "ADMIN" || session?.user?.role === "GROUP_LEADER") && (
              <>
                <Link
                  href="/admin?tab=purchases"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/admin" && tab === "purchases"
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  采购管理
                </Link>
                <Link
                  href="/admin?tab=hours"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/admin" && tab === "hours"
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  工时管理
                </Link>
              </>
            )}
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin?tab=users"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === "/admin" && tab === "users"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                用户管理
              </Link>
            )}
            {session && session.user?.role !== "ADMIN" ? (
              <>
                <Link
                  href="/hours"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive("/hours")
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  工时申请
                </Link>
                <Link
                  href="/purchases/new"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive("/purchases/new")
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  提交采购
                </Link>
              </>
            ) : !session ? (
              <Link
                href="/guide"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/guide")
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                使用说明
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {status === "loading" ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
          ) : session ? (
            <>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-gray-800">
                  {session.user?.name || session.user?.email}
                </span>
                <span className="text-xs text-gray-500 capitalize">
                  {session.user?.role === "ADMIN" ? "管理员" : session.user?.role === "GROUP_LEADER" ? "组长" : "用户"}
                </span>
              </div>
              <NotificationBell />
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-1 text-gray-700 hover:text-indigo-700 focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-bold">
                    {session.user?.name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase()}
                  </div>
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      个人资料
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-700"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}