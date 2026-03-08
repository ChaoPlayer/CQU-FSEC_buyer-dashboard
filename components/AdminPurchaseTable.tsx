"use client";

import { useState } from "react";
import { PurchaseWithUser } from "@/types";
import { Status } from "@prisma/client";

interface AdminPurchaseTableProps {
  purchases: PurchaseWithUser[];
}

export default function AdminPurchaseTable({ purchases }: AdminPurchaseTableProps) {
  const [localPurchases, setLocalPurchases] = useState(purchases);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, newStatus: Status) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLocalPurchases(prev =>
          prev.map(p => (p.id === id ? { ...p, status: newStatus } : p))
        );
      } else {
        alert("更新状态失败");
      }
    } catch (error) {
      console.error(error);
      alert("网络错误");
    } finally {
      setUpdatingId(null);
    }
  };

  const downloadPdf = (pdfUrl: string | null, fileName: string | null, itemName: string) => {
    if (!pdfUrl) {
      alert("该采购没有上传 PDF 发票");
      return;
    }
    // 创建临时链接并触发下载
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = fileName || `${itemName.replace(/[^\w]/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN");
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              用户
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              物品名称
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              金额
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              提交时间
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              详情
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {localPurchases.map((purchase) => (
            <tr key={purchase.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {purchase.submittedBy?.name || purchase.submittedBy?.email}
                </div>
                <div className="text-xs text-gray-500">
                  {purchase.submittedBy?.email}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {purchase.itemName}
                </div>
                {purchase.note && (
                  <div className="text-sm text-gray-500">{purchase.note}</div>
                )}
                {purchase.buyLink && (
                  <a
                    href={purchase.buyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    查看链接
                  </a>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-gray-900">
                  ¥{purchase.amount.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">{purchase.currency}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      purchase.status === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : purchase.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {purchase.status === "APPROVED"
                      ? "已批准"
                      : purchase.status === "REJECTED"
                      ? "已拒绝"
                      : "待审核"}
                  </span>
                  {updatingId === purchase.id ? (
                    <span className="text-xs text-gray-500">更新中...</span>
                  ) : (
                    <select
                      value={purchase.status}
                      onChange={(e) => handleStatusChange(purchase.id, e.target.value as Status)}
                      className="text-xs border rounded p-1"
                    >
                      <option value="PENDING">待审核</option>
                      <option value="APPROVED">批准</option>
                      <option value="REJECTED">拒绝</option>
                    </select>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(purchase.createdAt.toISOString())}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <a
                  href={`/purchases/${purchase.id}`}
                  className="text-indigo-600 hover:text-indigo-900"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看详情
                </a>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() =>
                    downloadPdf(purchase.pdfUrl, purchase.fileName, purchase.itemName)
                  }
                  className="text-indigo-600 hover:text-indigo-900"
                  disabled={!purchase.pdfUrl}
                >
                  下载PDF
                </button>
                <button
                  onClick={() => handleStatusChange(purchase.id, "APPROVED")}
                  className="text-green-600 hover:text-green-900"
                >
                  批准
                </button>
                <button
                  onClick={() => handleStatusChange(purchase.id, "REJECTED")}
                  className="text-red-600 hover:text-red-900"
                >
                  拒绝
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {localPurchases.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          暂无采购记录。
        </div>
      )}
    </div>
  );
}