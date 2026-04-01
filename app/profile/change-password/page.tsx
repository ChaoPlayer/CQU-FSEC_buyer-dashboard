"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("新密码长度至少为6位");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "修改密码失败");
      }

      setSuccess("密码修改成功，即将跳转到个人资料页...");
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">修改密码</h1>
            <p className="text-gray-600 mt-2">请提供当前密码并设置新密码</p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                当前密码
              </label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
                placeholder="请输入当前密码"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                新密码
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
                placeholder="请输入新密码（至少6位）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                确认新密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-4">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-600 text-sm text-center bg-green-50 border border-green-200 rounded-lg p-4">
                {success}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? "处理中..." : "确认修改"}
              </button>
              <Link
                href="/profile"
                className="flex-1 py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-center transition-colors"
              >
                返回个人资料
              </Link>
            </div>
          </form>

          <div className="mt-8 text-sm text-gray-500 text-center">
            <p>忘记当前密码？请联系管理员重置密码。</p>
          </div>
        </div>
      </div>
    </div>
  );
}