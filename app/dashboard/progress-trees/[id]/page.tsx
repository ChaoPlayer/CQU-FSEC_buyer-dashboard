import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, TreeStatus, VersionType, VersionStatus } from "@prisma/client";
import Link from "next/link";
import { ArrowLeftIcon, DocumentTextIcon, UserGroupIcon, CalendarIcon, CheckCircleIcon, ClockIcon, XCircleIcon, FolderIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import VerticalTimeline from "@/components/progress-tree/VerticalTimeline";
import SubmitVersionButton from "@/components/progress-tree/SubmitVersionButton";
import MergeActions from "@/components/progress-tree/MergeActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgressTreeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // 获取进度树详情，包含版本列表、提交者信息等
  const tree = await prisma.progressTree.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: { createdAt: "desc" },
        include: {
          submitter: {
            select: {
              id: true,
              realName: true,
              email: true,
            },
          },
          mergedBy: {
            select: {
              id: true,
              realName: true,
            },
          },
          hourRecord: {
            select: {
              id: true,
              hours: true,
            },
          },
        },
      },
    },
  });

  if (!tree) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">进度树不存在</h1>
          <p className="mt-2 text-gray-600">您请求的进度树可能已被删除或您没有权限访问。</p>
          <Link href="/dashboard/progress-trees" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  // 权限检查：ADMIN 和 GROUP_LEADER 可以查看任何组（只读），普通用户只能查看自己组
  const isAdmin = session.user.role === Role.ADMIN;
  const isGroupLeader = session.user.role === Role.GROUP_LEADER;
  const userGroupId = session.user.groupId;
  const canView = isAdmin || isGroupLeader || (userGroupId && userGroupId === tree.groupId);
  if (!canView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">无权访问</h1>
          <p className="mt-2 text-gray-600">您没有权限查看此进度树。</p>
          <Link href="/dashboard/progress-trees" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  const canSubmit = tree.status === TreeStatus.ACTIVE && (isAdmin || (isGroupLeader && userGroupId === tree.groupId) || userGroupId === tree.groupId);
  const canManage = isAdmin || (isGroupLeader && userGroupId === tree.groupId);

  // 真正的创建人：要么是组长（组长创建默认是自己的），要么是本人ID匹配
  const isCreator = isGroupLeader || tree.creatorId === session.user.id;
  
  // 非创建者的管理员，可选择强制写入新主线
  const isAdminNonCreator = isAdmin && tree.creatorId !== session.user.id;

  // 主线版本列表（供非创建人选择源版本）
  const mainVersionOptions = tree.versions
    .filter(v => v.type === VersionType.MAIN && v.status === VersionStatus.MERGED)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(v => ({ id: v.id, versionNumber: v.versionNumber, name: v.name ?? null }));

  const mainVersion = tree.versions.find(v => v.type === VersionType.MAIN);
  const pendingVersions = tree.versions.filter(v => v.status === VersionStatus.PENDING);
  const mergedVersions = tree.versions.filter(v => v.status === VersionStatus.MERGED);
  const rejectedVersions = tree.versions.filter(v => v.status === VersionStatus.REJECTED);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/progress-trees" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          返回进度树列表
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 左侧详情面板 */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tree.name}</h1>
                {tree.description && (
                  <p className="text-gray-600 mt-2">{tree.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${tree.status === TreeStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {tree.status === TreeStatus.ACTIVE ? '活跃' : '已归档'}
                </span>
                {canManage && (
                  <Link
                    href={`/dashboard/progress-trees/${tree.id}/edit`}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    编辑
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center text-sm text-gray-500">
                <UserGroupIcon className="w-5 h-5 mr-2 text-gray-400" />
                <span>所属组：{tree.group.name}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <FolderIcon className="w-5 h-5 mr-2 text-gray-400" />
                <span>版本总数：{tree.versions.length}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <CalendarIcon className="w-5 h-5 mr-2 text-gray-400" />
                <span>创建时间：{new Date(tree.createdAt).toLocaleString("zh-CN")}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-400" />
                <span>更新时间：{new Date(tree.updatedAt).toLocaleString("zh-CN")}</span>
              </div>
            </div>

            {mainVersion && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">当前主干版本</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">文件：</span>
                      {mainVersion.fileName}
                    </div>
                    <span className="text-sm text-gray-500">V{mainVersion.versionNumber}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">提交者：</span>
                    {mainVersion.submitter.realName} ({mainVersion.submitter.email})
                  </div>
                  {mainVersion.description && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">更新说明：</span>
                      "{mainVersion.description}"
                    </div>
                  )}
                  <div className="mt-2">
                    <a
                      href={`/uploads/progress-trees/${tree.group.name}/${mainVersion.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-1" />
                      下载文件
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 版本列表 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">版本历史</h2>
              {canSubmit && (
                    <SubmitVersionButton
                      treeId={tree.id}
                      groupName={tree.group.name}
                      isCreator={isCreator}
                      isAdminNonCreator={isAdminNonCreator}
                      mainVersions={mainVersionOptions}
                    />
              )}
            </div>

            {tree.versions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300" />
                <p className="mt-2">暂无版本记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tree.versions.map((version) => (
                  <div key={version.id} className={`border rounded-lg p-4 ${version.status === VersionStatus.MERGED ? 'bg-green-50 border-green-200' : version.status === VersionStatus.REJECTED ? 'bg-red-50 border-red-200' : version.status === VersionStatus.PENDING ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${version.type === VersionType.MAIN ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {version.type === VersionType.MAIN ? '主干' : '分支'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${version.status === VersionStatus.MERGED ? 'bg-green-100 text-green-800' : version.status === VersionStatus.REJECTED ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {version.status === VersionStatus.MERGED ? '已合并' : version.status === VersionStatus.REJECTED ? '已驳回' : '待审核'}
                          </span>
                          <span className="text-sm text-gray-500">V{version.versionNumber}</span>
                        </div>
                        <h4 className="font-medium text-gray-900 mt-2">{version.fileName}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">提交者：</span>
                          {version.submitter.realName} • {new Date(version.createdAt).toLocaleString("zh-CN")}
                        </div>
                        {version.description && (
                          <p className="text-sm text-gray-600 mt-2">"{version.description}"</p>
                        )}
                        {version.mergedBy && (
                          <div className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">合并人：</span>
                            {version.mergedBy.realName} • {new Date(version.mergedAt!).toLocaleString("zh-CN")}
                          </div>
                        )}
                        {version.hourRecord && (
                          <div className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">发放工时：</span>
                            {version.hourRecord.hours} 小时
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <a
                          href={`/uploads/progress-trees/${tree.group.name}/${version.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <DocumentTextIcon className="w-4 h-4 mr-1" />
                          下载
                        </a>
                        {canManage && version.status === VersionStatus.PENDING && version.type === VersionType.BRANCH && (
                          <MergeActions version={version} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧垂直时间轴 */}
        <div className="lg:w-1/3">
          <VerticalTimeline versions={tree.versions} />
        </div>
      </div>
    </div>
  );
}