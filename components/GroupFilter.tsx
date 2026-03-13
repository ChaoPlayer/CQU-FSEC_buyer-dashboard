"use client";

import { useRouter } from "next/navigation";

interface GroupFilterProps {
  groups: Array<{ group: string | null }>;
  currentGroup?: string;
  subtab: string;
  tab?: string;
}

export default function GroupFilter({ groups, currentGroup, subtab, tab = 'purchases' }: GroupFilterProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroup = e.target.value;
    const params = new URLSearchParams();
    params.set("tab", tab);
    params.set("subtab", subtab);
    if (newGroup) {
      params.set("group", newGroup);
    }
    router.push(`/admin?${params.toString()}`);
  };

  const filteredGroups = groups.filter(g => g.group !== null);

  return (
    <div className="px-6 py-4 border-b bg-gray-50">
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium">选择组别：</span>
        <select
          value={currentGroup || ""}
          onChange={handleChange}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value="">-- 请选择组别 --</option>
          {filteredGroups.map((g) => (
            <option key={g.group!} value={g.group!}>
              {g.group}
            </option>
          ))}
        </select>
        {currentGroup && (
          <span className="text-sm text-gray-600">
            当前组别：<strong>{currentGroup}</strong>
          </span>
        )}
      </div>
    </div>
  );
}