"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";

interface MainVersionOption {
  id: string;
  versionNumber: number | null;
  name: string | null;
}

interface SubmitVersionButtonProps {
  treeId: string;
  groupName: string;
  isCreator: boolean;
  isAdminNonCreator?: boolean;
  mainVersions: MainVersionOption[];
}

export default function SubmitVersionButton({
  treeId,
  groupName,
  isCreator,
  isAdminNonCreator = false,
  mainVersions,
}: SubmitVersionButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState("");
  const [description, setDescription] = useState("");
  const [parentVersionId, setParentVersionId] = useState("");
  const [forceMain, setForceMain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
    setFile(null);
    setVersionName("");
    setDescription("");
    setParentVersionId("");
    setForceMain(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("请选择要上传的文件");
      return;
    }
    if (!description.trim()) {
      setError("请填写修改说明");
      return;
    }
    // 非创建人且非强制写入时，必须选择源版本
    if (!isCreator && !forceMain && !parentVersionId) {
      setError("请选择您的修改基于哪个主线版本");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 第一步：上传文件
      const formData = new FormData();
      formData.append("file", file);
      formData.append("groupName", groupName);
      const uploadRes = await fetch("/api/upload/progress-tree", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.message || "文件上传失败");
      }
      const uploadResult = await uploadRes.json();
      const { filePath, fileName } = uploadResult;

      // 第二步：创建版本记录
      const versionRes = await fetch("/api/progress-trees/" + treeId + "/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          filePath,
          description,
          name: versionName.trim() || undefined,
          parentVersionId: (!forceMain && parentVersionId) ? parentVersionId : undefined,
          forceMain: forceMain || undefined,
        }),
      });
      if (!versionRes.ok) {
        const data = await versionRes.json();
        throw new Error(data.message || "版本提交失败");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "提交过程中发生错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        <DocumentArrowUpIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
        提交新版本
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-600/75 z-40 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          {/* Modal content */}
          <div className="relative z-50 bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-900">提交新版本</h3>
                <div className="mt-4">
                  <form onSubmit={handleSubmit}>
                    {/* 管理员（非创建者）：提交类型选择 */}
                    {isAdminNonCreator && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs font-semibold text-amber-800 mb-2">⚡ 管理员权限</p>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={forceMain}
                            onChange={(e) => {
                              setForceMain(e.target.checked);
                              if (e.target.checked) setParentVersionId("");
                            }}
                            className="mt-0.5 h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                          />
                          <span className="text-sm text-amber-800">
                            <span className="font-semibold">强制写入为新主线版本</span>
                            <span className="block text-xs text-amber-600 mt-0.5">跳过分支审批流程，直接更新主线（谨慎使用）</span>
                          </span>
                        </label>
                      </div>
                    )}

                    {/* 非创建人：必须选择源版本（未选择强制写入时显示） */}
                    {!isCreator && !forceMain && (
                      <div className="mb-4">
                        <label htmlFor="parentVersionId" className="block text-sm font-medium text-gray-700">
                          修改基于的版本 <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5 mb-1">
                          请选择您是在哪个主线版本的基础上进行修改的
                        </p>
                        {mainVersions.length === 0 ? (
                          <p className="text-sm text-yellow-600 bg-yellow-50 rounded px-3 py-2 border border-yellow-200">
                            当前暂无主线版本，无法提交分支
                          </p>
                        ) : (
                          <select
                            id="parentVersionId"
                            value={parentVersionId}
                            onChange={(e) => setParentVersionId(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                            required
                          >
                            <option value="">-- 请选择源版本 --</option>
                            {mainVersions.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name
                                  ? `${v.name}（V${v.versionNumber}）`
                                  : `V${v.versionNumber}`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <div className="mb-4">
                      <label htmlFor="versionName" className="block text-sm font-medium text-gray-700">
                        版本名称 <span className="text-gray-400 font-normal">（可选）</span>
                      </label>
                      <input
                        id="versionName"
                        type="text"
                        value={versionName}
                        onChange={(e) => setVersionName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                        placeholder="给这个版本起个名字（如：车架初版、第二轮迭代）"
                        maxLength={50}
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        选择文件（支持所有格式，最大 10MB）
                      </label>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {file && (
                        <p className="mt-2 text-sm text-gray-600">已选择：{file.name}</p>
                      )}
                    </div>

                    <div className="mb-6">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        修改说明 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border"
                        placeholder="详细描述本次提交的修改内容"
                        required
                      />
                    </div>

                    {error && (
                      <div className="mb-4 rounded-md bg-red-50 p-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={loading}
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={loading || (!isCreator && mainVersions.length === 0)}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {loading ? "提交中..." : "提交"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
