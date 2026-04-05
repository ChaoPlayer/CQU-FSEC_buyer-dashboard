import { ProgressTree, TreeStatus, TreeVersion, VersionType, VersionStatus } from "@prisma/client";
import Link from "next/link";
import {
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FolderIcon,
  ChevronRightIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

interface ProgressTreeCardProps {
  tree: ProgressTree & {
    group: {
      id: string;
      name: string;
    };
    creator?: {
      id: string;
      realName: string;
      email: string;
    } | null;
    versions: (TreeVersion & {
      submitter: {
        id: string;
        realName: string;
        email: string;
      };
    })[];
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return "今天";
  } else if (diffDays === 1) {
    return "昨天";
  } else if (diffDays < 7) {
    return `${diffDays} 天前`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} 周前`;
  } else {
    return `${Math.floor(diffDays / 30)} 个月前`;
  }
}

export default function ProgressTreeCard({ tree }: ProgressTreeCardProps) {
  const latestVersion = tree.versions.length > 0 ? tree.versions[0] : null;
  const isActive = tree.status === TreeStatus.ACTIVE;
  const versionCount = tree.versions.length;

  const getStatusBadge = (status: TreeStatus) => {
    switch (status) {
      case TreeStatus.ACTIVE:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            活跃
          </span>
        );
      case TreeStatus.ARCHIVED:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            已归档
          </span>
        );
      default:
        return null;
    }
  };

  const getVersionTypeBadge = (type?: VersionType) => {
    if (!type) return null;
    switch (type) {
      case VersionType.MAIN:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <FolderIcon className="w-3 h-3 mr-1" />
            主线
          </span>
        );
      case VersionType.BRANCH:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            <ChevronRightIcon className="w-3 h-3 mr-1" />
            分支
          </span>
        );
      default:
        return null;
    }
  };

  const getVersionStatusBadge = (status?: VersionStatus) => {
    if (!status) return null;
    switch (status) {
      case VersionStatus.PENDING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            待审核
          </span>
        );
      case VersionStatus.MERGED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            已合并
          </span>
        );
      case VersionStatus.REJECTED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-3 h-3 mr-1" />
            已驳回
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{tree.name}</h3>
            {tree.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{tree.description}</p>
            )}
          </div>
          {getStatusBadge(tree.status)}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <UserGroupIcon className="w-4 h-4 mr-2 text-gray-400" />
            <span className="truncate">{tree.group.name}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <FolderIcon className="w-4 h-4 mr-2 text-gray-400" />
            <span>{versionCount} 个版本</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
            <span className="truncate">
              创建人：{tree.creator?.realName || tree.creator?.email || "未知"}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
            <span>创建于 {formatRelative(new Date(tree.createdAt))}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500 col-span-2">
            <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-400" />
            <span>更新于 {formatRelative(new Date(tree.updatedAt))}</span>
          </div>
        </div>

        {latestVersion && (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">最新版本</span>
                {getVersionTypeBadge(latestVersion.type)}
                {getVersionStatusBadge(latestVersion.status)}
              </div>
              <span className="text-xs text-gray-500">V{latestVersion.versionNumber}</span>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">文件:</span> {latestVersion.fileName}
                </div>
                <div>
                  <span className="font-medium">提交者:</span> {latestVersion.submitter.realName}
                </div>
              </div>
              {latestVersion.description && (
                <p className="mt-2 text-gray-500 line-clamp-2">"{latestVersion.description}"</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <Link
            href={`/dashboard/progress-trees/${tree.id}`}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            查看详情
          </Link>
          {isActive && (
            <Link
              href={`/dashboard/progress-trees/${tree.id}/submit`}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              提交分支
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}