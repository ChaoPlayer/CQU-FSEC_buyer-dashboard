"use client";

import { useState, useEffect } from "react";
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

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowDropdown(true)}
      onMouseLeave={() => setShowDropdown(false)}
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

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4 border-b flex justify-between items-center">
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
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-200">
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
          <div className="p-3 border-t text-center">
            <Link
              href="/notifications"
              className="text-sm text-indigo-600 hover:underline"
              onClick={() => setShowDropdown(false)}
            >
              查看所有通知
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}