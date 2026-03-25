"use client";

import { useState, useEffect, Fragment } from "react";
import { WorkSubmissionStatus } from "@prisma/client";
import Link from "next/link";
import { Dialog, Transition } from '@headlessui/react';

interface WorkSubmissionWithUser {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  fileName: string | null;
  status: WorkSubmissionStatus;
  createdAt: Date;
  approvedHours?: number | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    realName: string | null;
    group: string | null;
  };
}

interface AdminWorkSubmissionTableProps {
  submissions: WorkSubmissionWithUser[];
}

export default function AdminWorkSubmissionTable({ submissions }: AdminWorkSubmissionTableProps) {
  const [localSubmissions, setLocalSubmissions] = useState(submissions);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<WorkSubmissionWithUser | null>(null);
  const [hoursInput, setHoursInput] = useState('');

  useEffect(() => {
    setLocalSubmissions(submissions);
    setSelectedIds([]);
  }, [submissions]);


  const handleStatusChange = async (id: string, newStatus: WorkSubmissionStatus, hours?: number) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/work-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus, approvedHours: hours }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLocalSubmissions(prev =>
          prev.map(s => (s.id === id ? { ...s, status: updated.status } : s))
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

  const handleDetailClick = (submission: WorkSubmissionWithUser) => {
    setSelectedSubmission(submission);
    setHoursInput(submission.approvedHours?.toString() || '');
    setModalOpen(true);
  };

  const handleApproveWithHours = (id: string) => {
    const hoursStr = prompt("请输入兑换工时（小时，支持小数）：");
    if (hoursStr === null) return;
    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours <= 0) {
      alert("请输入有效的正数工时");
      return;
    }
    handleStatusChange(id, "APPROVED", hours);
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) {
      alert("请至少选择一条申请");
      return;
    }
    const hoursStr = prompt(`批量批准 ${selectedIds.length} 条申请，请输入统一的兑换工时（小时）：`);
    if (hoursStr === null) return;
    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours <= 0) {
      alert("请输入有效的正数工时");
      return;
    }
    for (const id of selectedIds) {
      await handleStatusChange(id, "APPROVED", hours);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) {
      alert("请至少选择一条申请");
      return;
    }
    if (!confirm(`确定要拒绝选中的 ${selectedIds.length} 条申请吗？`)) return;
    for (const id of selectedIds) {
      await handleStatusChange(id, "REJECTED");
    }
  };

  const downloadFile = (fileUrl: string | null, fileName: string | null, title: string) => {
    if (!fileUrl) {
      alert("该申请没有上传文件");
      return;
    }
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName || `${title.replace(/[^\w]/g, "_")}.file`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchDownload = () => {
    if (selectedIds.length === 0) {
      alert("请至少选择一条申请");
      return;
    }
    localSubmissions
      .filter(s => selectedIds.includes(s.id) && s.fileUrl)
      .forEach(s => downloadFile(s.fileUrl, s.fileName, s.title));
    if (selectedIds.every(id => !localSubmissions.find(s => s.id === id)?.fileUrl)) {
      alert("选中的申请均没有上传文件");
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("zh-CN");
  };

  const getStatusColor = (status: WorkSubmissionStatus) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "APPROVED": return "bg-green-100 text-green-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: WorkSubmissionStatus) => {
    switch (status) {
      case "PENDING": return "待审批";
      case "APPROVED": return "已批准";
      case "REJECTED": return "已拒绝";
      default: return status;
    }
  };

  return (
    <div className="overflow-x-auto">
      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-800">
            已选择 <strong>{selectedIds.length}</strong> 条申请
          </span>
          <div className="space-x-3">
            <button
              onClick={handleBatchApprove}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              批量批准
            </button>
            <button
              onClick={handleBatchReject}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              批量拒绝
            </button>
            <button
              onClick={handleBatchDownload}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
            >
              批量下载文件
            </button>
          </div>
        </div>
      )}
      <table className="min-w-full border-none">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={selectedIds.length === localSubmissions.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(localSubmissions.map(s => s.id));
                  } else {
                    setSelectedIds([]);
                  }
                }}
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              用户
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              组别
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              工作名称
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              提交时间
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              文件
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {localSubmissions.map((submission, index) => (
            <tr key={submission.id} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}>
              <td className="px-4 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(submission.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds([...selectedIds, submission.id]);
                    } else {
                      setSelectedIds(selectedIds.filter(id => id !== submission.id));
                    }
                  }}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {submission.user.realName || submission.user.email || '未知用户'}
                </div>
                <div className="text-xs text-gray-500">
                  {submission.user.email}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {submission.user.group || "未分组"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {submission.title}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-xs">
                  {submission.description || "无描述"}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(submission.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
                  {getStatusText(submission.status)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {submission.fileUrl ? (
                  <button
                    onClick={() => downloadFile(submission.fileUrl, submission.fileName, submission.title)}
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    下载
                  </button>
                ) : (
                  <span className="text-sm text-gray-400">无文件</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                {submission.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => handleApproveWithHours(submission.id)}
                      disabled={updatingId === submission.id}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {updatingId === submission.id ? "处理中..." : "批准"}
                    </button>
                    <button
                      onClick={() => handleStatusChange(submission.id, "REJECTED")}
                      disabled={updatingId === submission.id}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {updatingId === submission.id ? "处理中..." : "拒绝"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDetailClick(submission)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  详情
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {localSubmissions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          暂无工作申请记录
        </div>
      )}

      {/* 详情模态框 */}
      <Transition appear show={modalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 text-left align-middle shadow-xl">
                  {!selectedSubmission ? (
                    <div className="py-8 text-center text-gray-500">加载中...</div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <Dialog.Title as="h2" className="text-2xl font-bold text-gray-900">
                          工作申请详情
                        </Dialog.Title>
                        <button
                          onClick={() => setModalOpen(false)}
                          className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                          &times;
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium text-gray-700">提交人</h3>
                          <p>{selectedSubmission.user.realName || selectedSubmission.user.email || '未知用户'}</p>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-700">提交时间</h3>
                          <p>{new Date(selectedSubmission.createdAt).toLocaleString('zh-CN')}</p>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-700">工作名称</h3>
                          <p>{selectedSubmission.title}</p>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-700">工作内容描述</h3>
                          <p className="whitespace-pre-wrap">{selectedSubmission.description || '无描述'}</p>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-700">文件</h3>
                          {selectedSubmission.fileUrl ? (
                            <a
                              href={selectedSubmission.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              {selectedSubmission.fileName || '下载文件'}
                            </a>
                          ) : (
                            <p>无文件</p>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-700">状态</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedSubmission.status)}`}>
                            {getStatusText(selectedSubmission.status)}
                          </span>
                        </div>
                        {selectedSubmission.status === 'PENDING' && (
                          <div className="border-t pt-6">
                            <h3 className="font-medium text-gray-700 mb-2">审批操作</h3>
                            <div className="flex items-center space-x-4">
                              <div className="flex-1">
                                <label htmlFor="hours" className="block text-sm font-medium text-gray-700">
                                  兑换工时（小时）
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  id="hours"
                                  value={hoursInput}
                                  onChange={(e) => setHoursInput(e.target.value)}
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                              <div className="space-x-2">
                                <button
                                  onClick={() => {
                                    const hours = parseFloat(hoursInput);
                                    if (isNaN(hours) || hours <= 0) {
                                      alert('请输入有效的正数工时');
                                      return;
                                    }
                                    handleStatusChange(selectedSubmission.id, 'APPROVED', hours);
                                    setModalOpen(false);
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  批准
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('确定拒绝该申请吗？')) {
                                      handleStatusChange(selectedSubmission.id, 'REJECTED');
                                      setModalOpen(false);
                                    }
                                  }}
                                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  拒绝
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-8 flex justify-end">
                        <button
                          onClick={() => setModalOpen(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                        >
                          关闭
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}