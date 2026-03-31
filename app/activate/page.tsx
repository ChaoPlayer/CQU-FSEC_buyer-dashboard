"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActivatePage() {
  const [step, setStep] = useState<"verify" | "activate">("verify");
  const [realName, setRealName] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [group, setGroup] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const groupOptions = ["线路组", "电池组", "电控组", "转向组", "车架组", "悬架组", "车身组", "制动组", "传动组", "综合部"];

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "验证失败");
      }

      setUserId(data.userId);
      // 如果邮箱是占位符（包含 _pending@），则清空
      const email = data.email || "";
      const isPlaceholder = email.includes("_pending@");
      setEmail(isPlaceholder ? "" : email);
      setStudentId(data.studentId || "");
      setGroup(data.group || "");
      setStep("activate");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/activate-internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email,
          studentId,
          group,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "激活失败");
      }

      // 激活成功后跳转到登录页面
      router.push("/login?activated=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {step === "verify" ? "验证姓名" : "激活账号"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === "verify"
              ? "请输入您的真实姓名以验证账号"
              : "请设置您的邮箱、学号、组别和密码"}
          </p>
        </div>

        {step === "verify" ? (
          <form className="mt-8 space-y-6" onSubmit={handleVerify}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="realName" className="sr-only">
                  真实姓名
                </label>
                <input
                  id="realName"
                  name="realName"
                  type="text"
                  autoComplete="given-name"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="真实姓名"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? "验证中..." : "下一步"}
              </button>
            </div>

            <div className="text-sm text-center">
              <p className="text-gray-600">
                没有预注册账号？{" "}
                <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                  前往注册
                </a>
              </p>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleActivate}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="realName" className="sr-only">
                  真实姓名
                </label>
                <input
                  id="realName"
                  name="realName"
                  type="text"
                  className="appearance-none rounded-t-md relative block w-full px-3 py-2 border bg-gray-100 text-gray-700 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  value={realName}
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">真实姓名已由预注册名单提供，不可修改</p>
              </div>
              <div>
                <label htmlFor="email" className="sr-only">
                  邮箱地址
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="studentId" className="sr-only">
                  学号
                </label>
                <input
                  id="studentId"
                  name="studentId"
                  type="text"
                  autoComplete="off"
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${studentId.trim() ? 'bg-gray-100 text-gray-700 border-gray-300' : 'border-gray-300 placeholder-gray-500 text-gray-900'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="学号（可选）"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  readOnly={studentId.trim() !== ''}
                />
                {studentId.trim() && (
                  <p className="text-xs text-gray-500 mt-1">学号已由预注册名单提供，不可修改</p>
                )}
              </div>
              <div>
                <label htmlFor="group" className="sr-only">
                  所属组别
                </label>
                {group.trim() ? (
                  <>
                    <input
                      type="text"
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border bg-gray-100 text-gray-700 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                      value={group}
                      readOnly
                    />
                    <input type="hidden" name="group" value={group} />
                    <p className="text-xs text-gray-500 mt-1">组别已由预注册名单提供，不可修改</p>
                  </>
                ) : (
                  <select
                    id="group"
                    name="group"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                  >
                    <option value="" disabled>请选择组别（可选）</option>
                    {groupOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="密码（至少6位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  确认密码
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="确认密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? "激活中..." : "激活账号"}
              </button>
            </div>

            <div className="text-sm text-center">
              <button
                type="button"
                onClick={() => setStep("verify")}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                返回上一步
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}