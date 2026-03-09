"use client";

import { useState, useEffect, useRef } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  content: string | null;
  read: boolean;
  createdAt: string;
  purchase?: {
    id: string;
    itemName: string;
  } | null;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=5");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("获取通知失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("标记已读失败:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("标记全部已读失败:", error);
    }
  };

  const handleMouseEnter = () => {
    // 清除离开延迟
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    // 设置悬停延迟 150ms
    hoverTimeoutRef.current = setTimeout(() => {
      setShowDropdown(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    // 清除悬停延迟
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // 设置离开延迟 300ms 后关闭
    leaveTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 300);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="p-2 rounded-full hover:bg-gray-100 relative"
        aria-label="通知"
      >
        <BellIcon className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 下拉框，始终渲染但通过 CSS 控制显示 */}
      <div
        className={`absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 transition-all duration-200 ease-in-out ${
          showDropdown
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
        onMouseEnter={() => {
          // 鼠标进入下拉框时取消离开延迟
          if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
          }
        }}
        onMouseLeave={() => {
          // 鼠标离开下拉框时触发延迟关闭
          leaveTimeoutRef.current = setTimeout(() => {
            setShowDropdown(false);
          }, 300);
        }}
      >
        {/* 移除上下边框 */}
        <div className="p-4 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">通知</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-indigo-600 hover:underline"
            >
              全部标记为已读
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">加载中...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">暂无通知</div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 ${
                  !notification.read ? "bg-blue-50" : ""
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex justify-between">
                  <h4 className="font-medium text-gray-900">
                    {notification.title}
                  </h4>
                  {!notification.read && (
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {notification.content}
                </p>
                {notification.purchase && (
                  <Link
                    href={`/purchases/${notification.purchase.id}`}
                    className="text-sm text-indigo-600 hover:underline mt-1 block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    查看采购详情
                  </Link>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(notification.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="p-3 text-center">
          <Link
            href="/notifications"
            className="text-sm text-indigo-600 hover:underline"
            onClick={() => setShowDropdown(false)}
          >
            查看所有通知
          </Link>
        </div>
      </div>
    </div>
  );
}