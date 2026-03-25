"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type View = 'SELECT' | 'INTERNAL' | 'INVITE';

export default function RegisterPage() {
  const [view, setView] = useState<View>('SELECT');
  const [realName, setRealName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [group, setGroup] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const groupOptions = ["线路组", "电池组", "电控组", "转向组", "车架组", "悬架组", "车身组", "制动组", "传动组", "综合部"];

  const handleInternalActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!realName.trim()) {
      setError("请输入真实姓名");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/verify-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realName: realName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "验证失败");
      }

      // 验证成功，跳转到激活页面并携带用户ID
      router.push(`/activate?userId=${data.userId}`);
    } catch (err: any) {
      setError(err.message || "内部激活失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!inviteCode.trim()) {
      setError("请输入邀请码");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, realName, studentId, group, inviteCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "注册失败");
      }

      // 注册成功后跳转到登录页面
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSelectView = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-4xl w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-4xl font-bold text-gray-900">
            加入车队管理平台
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            请选择您的注册方式
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {/* 内部激活卡片 */}
          <div 
            className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-2xl hover:scale-105"
            onClick={() => setView('INTERNAL')}
          >
            <div className="text-6xl mb-6">🏎️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">车队内部成员激活</h3>
            <p className="text-gray-600 text-center mb-6">
              如果您已被管理员预注册，请使用真实姓名激活账号。
            </p>
            <div className="mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg">
              立即激活
            </div>
          </div>

          {/* 邀请码注册卡片 */}
          <div 
            className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-2xl hover:scale-105"
            onClick={() => setView('INVITE')}
          >
            <div className="text-6xl mb-6">🔑</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">使用邀请码注册</h3>
            <p className="text-gray-600 text-center mb-6">
              如果您拥有7位邀请码，请在此处填写完整信息注册新账号。
            </p>
            <div className="mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg">
              使用邀请码注册
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-gray-500 mt-12">
          <p>已有账号？ <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">去登录</a></p>
        </div>
      </div>
    </div>
  );

  const renderInternalView = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <button
            onClick={() => setView('SELECT')}
            className="text-sm text-indigo-600 hover:text-indigo-500 mb-4 inline-flex items-center"
          >
            ← 返回选择
          </button>
          <h2 className="text-3xl font-bold text-gray-900">内部成员激活</h2>
          <p className="mt-2 text-gray-600">请输入您的真实姓名，验证后即可激活账号。</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleInternalActivation}>
          <div>
            <label htmlFor="realName" className="block text-sm font-medium text-gray-700">
              真实姓名
            </label>
            <input
              id="realName"
              name="realName"
              type="text"
              autoComplete="given-name"
              required
              className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="请输入真实姓名"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "验证中..." : "下一步"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderInviteView = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <button
            onClick={() => setView('SELECT')}
            className="text-sm text-indigo-600 hover:text-indigo-500 mb-4 inline-flex items-center"
          >
            ← 返回选择
          </button>
          <h2 className="text-3xl font-bold text-gray-900">使用邀请码注册</h2>
          <p className="mt-2 text-gray-600">填写以下信息注册账号（需提供7位邀请码）</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleInviteRegister}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="inviteCode" className="sr-only">
                邀请码（7位大写字母与数字）
              </label>
              <input
                id="inviteCode"
                name="inviteCode"
                type="text"
                autoComplete="off"
                required
                className="appearance-none rounded-t-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="邀请码（7位大写字母与数字）"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
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
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
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
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="真实姓名"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
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
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="学号"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="group" className="sr-only">
                所属组别
              </label>
              <select
                id="group"
                name="group"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              >
                <option value="" disabled>请选择组别</option>
                {groupOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
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
                className="appearance-none rounded-b-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="密码（至少6位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "注册中..." : "注册"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  switch (view) {
    case 'SELECT':
      return renderSelectView();
    case 'INTERNAL':
      return renderInternalView();
    case 'INVITE':
      return renderInviteView();
    default:
      return renderSelectView();
  }
}