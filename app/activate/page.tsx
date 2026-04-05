"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
}

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
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const router = useRouter();

  // 检测 URL 中是否携带 userId 参数（来自 /register 页面的跳转）
  // 如果有，则通过 GET /api/auth/verify-name?userId=xxx 直接获取用户信息，跳过 verify 步骤
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlUserId = params.get("userId");
    if (!urlUserId) return;

    setLoading(true);
    fetch(`/api/auth/verify-name?userId=${encodeURIComponent(urlUserId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUserId(data.userId);
          setRealName(data.realName || "");
          setEmail(data.email || "");
          setStudentId(data.studentId || "");
          setGroup(data.group || "");
          setStep("activate");
        } else {
          // userId 无效或账号已激活，显示错误，保留 verify 步骤让用户手动输入
          setError(data.message || "链接无效，请手动输入姓名进行验证");
        }
      })
      .catch(() => {
        setError("网络错误，请手动输入姓名进行验证");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 进入激活步骤时，若没有预注册组别，则拉取组别列表供用户选择
  useEffect(() => {
    if (step === "activate" && !group.trim() && groups.length === 0) {
      setGroupsLoading(true);
      fetch("/api/groups")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setGroups(data);
          }
        })
        .catch(() => {
          // 拉取失败不阻断流程
        })
        .finally(() => setGroupsLoading(false));
    }
  }, [step, group, groups.length]);

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
      <div className="max-w-xl w-full space-y-10 p-10 bg-white rounded-xl shadow-lg">
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
          <form className="mt-10 space-y-8" onSubmit={handleVerify}>
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
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
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
          <form className="mt-10 space-y-8" onSubmit={handleActivate}>
            <div className="rounded-md shadow-sm -space-y-px">
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
                  className="appearance-none rounded-t-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
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
                  className={`appearance-none rounded-none relative block w-full px-4 py-3 border ${studentId.trim() ? 'bg-gray-100 text-gray-700 border-gray-300' : 'border-gray-300 placeholder-gray-500 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors`}
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
                      className="appearance-none rounded-none relative block w-full px-4 py-3 border bg-gray-100 text-gray-700 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
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
                    className="appearance-none rounded-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    disabled={groupsLoading}
                  >
                    <option value="" disabled>
                      {groupsLoading ? "正在加载组别..." : "请选择组别（可选）"}
                    </option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}</option>
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
                  className="appearance-none rounded-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
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
                  className="appearance-none rounded-b-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
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
