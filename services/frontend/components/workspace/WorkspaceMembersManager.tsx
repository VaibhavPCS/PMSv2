'use client';

// Full-page member-management surface ported from the OLD WorkspaceSettingsModal
// "Add Employee" + "Change Roles" tabs. Reused by the Members page and the
// Workspace settings page. UI note: the 'viewer' role is supported by the
// backend for existing users but intentionally hidden in the UI; new invites
// cannot select 'viewer'. Existing viewer users still display read-only text.

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { toast } from 'sonner';
import { fetchData, postData, deleteData, patchData } from '@/lib/fetch-util';
import { UserPlus, Search, Trash2, Loader2 } from 'lucide-react';

type Role = 'member' | 'admin' | 'lead' | 'viewer' | 'head';

export interface MemberItem {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface WorkspaceMembersManagerProps {
  workspaceId?: string;
  showInvite?: boolean;
}

const roleDescriptions: Record<string, string> = {
  owner: 'Full control over workspace settings and membership.',
  admin: 'Manage employees and roles; create and delete projects.',
  head: 'Leads projects in the workspace; shown as Lead in UI.',
  lead: 'Coordinate employees and workflows within projects.',
  member: 'Collaborate on projects and tasks within the workspace (Employee).',
  viewer: 'Read-only access to projects and tasks.',
};

const getErrorMessage = (
  error: any,
  fallback: string,
  specific?: Record<number, string>
) => {
  const status = error?.response?.status as number | undefined;
  const backendMessage = error?.response?.data?.message as string | undefined;
  if (backendMessage) return backendMessage;
  if (error?.code === 'ERR_NETWORK') return 'Network error. Please check your connection.';
  if (specific && status && specific[status]) return specific[status];
  if (status === 401) return 'Unauthorized. Please sign in again.';
  if (status === 404) return 'Not found.';
  if (status === 403) return 'Forbidden. You do not have permission to perform this action.';
  if (status === 500) return 'Server error. Please try again later.';
  return error?.message || fallback;
};

export function WorkspaceMembersManager({
  workspaceId,
  showInvite = true,
}: WorkspaceMembersManagerProps) {
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('member');
  const [inviting, setInviting] = useState(false);

  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Migration state for blocked removals
  const [showMigration, setShowMigration] = useState(false);
  const [migrationData, setMigrationData] = useState<{
    tasks: any[];
    projects: any[];
    subordinates: any[];
    memberName: string;
  }>({ tasks: [], projects: [], subordinates: [], memberName: '' });

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (inviteEmail.length > 1 && openUserSelect) {
        setIsSearchingUsers(true);
        try {
          const res = await fetchData(`/workspace/users/search?query=${inviteEmail}`);
          const existingMemberIds = new Set(members.map((m) => m._id));
          const filteredUsers = (res.users || []).filter(
            (u: any) => !existingMemberIds.has(u._id)
          );
          setFoundUsers(filteredUsers);
        } catch (error) {
          console.error('Failed to search users', error);
        } finally {
          setIsSearchingUsers(false);
        }
      } else {
        setFoundUsers([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [inviteEmail, openUserSelect, members]);

  useEffect(() => {
    if (workspaceId) {
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadMembers = async () => {
    if (!workspaceId) return;
    setLoadingMembers(true);
    try {
      const res = await fetchData(`/workspace/${workspaceId}`);
      const ws = res?.data ?? res?.workspace ?? res;
      const memberItems: MemberItem[] = (ws?.members || []).map((m: any) => ({
        _id: m.userId?._id || m.userId,
        name: m.userId?.name || 'Unknown',
        email: m.userId?.email || '',
        role: m.role || 'member',
      }));
      setMembers(memberItems);
    } catch (error: any) {
      console.error('Failed to load workspace details', error);
      toast.error(
        getErrorMessage(error, 'Failed to load members', {
          404: 'Workspace not found',
          403: "You don't have access to this workspace",
        })
      );
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast.error('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Enter a valid email');
      return;
    }
    if (!workspaceId) return;

    setInviting(true);
    try {
      const res = await postData(`/workspace/${workspaceId}/invite`, { email, role: inviteRole });
      toast.success(res?.message || 'Invitation sent');
      setInviteEmail('');
      await loadMembers();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, 'Failed to send invite', {
          404: 'Workspace or user not found',
          403: 'Only owners and admins can invite members',
        })
      );
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: MemberItem, newRole: Role) => {
    if (!workspaceId) return;
    if (member.role === 'owner') {
      toast.error('Cannot change role of owner');
      return;
    }
    try {
      const res = await patchData(
        `/workspace/${workspaceId}/members/${member._id}/role`,
        { role: newRole }
      );
      const resBody = res?.data ?? res;
      toast.success(resBody?.message || 'Role updated');
      setMembers((prev) =>
        prev.map((m) => (m._id === member._id ? { ...m, role: newRole } : m))
      );
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, 'Failed to update role', {
          403: 'Only owners and admins can change member roles',
        })
      );
    }
  };

  const handleRemoveMember = async (member: MemberItem) => {
    if (!workspaceId) return;
    if (member.role === 'owner') {
      toast.error('Cannot remove the owner. Transfer ownership first.');
      return;
    }

    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetchData('/workspace/all-tasks'),
        fetchData('/project/recent?limit=1000'),
      ]);

      const allTasks = tasksRes.tasks || [];
      const allProjects = projectsRes.projects || [];

      const userTasks = allTasks.filter(
        (t: any) =>
          (t.assignedTo?._id === member._id || t.assignedTo === member._id) &&
          (['todo', 'to-do', 'in_progress', 'in-progress'].includes(t.status) ||
            t.approvalStatus === 'pending-approval')
      );
      const leadProjects = allProjects.filter((p: any) => p.projectHead?._id === member._id);

      let subordinates: any[] = [];
      allProjects.forEach((p: any) => {
        if (Array.isArray(p.members)) {
          const subs = p.members.filter((m: any) => m.reportsTo === member._id);
          if (subs.length > 0) {
            subordinates = [
              ...subordinates,
              ...subs.map((s: any) => ({ ...s, projectId: p._id, projectName: p.name })),
            ];
          }
        }
      });

      if (userTasks.length > 0 || leadProjects.length > 0 || subordinates.length > 0) {
        setMigrationData({
          tasks: userTasks,
          projects: leadProjects,
          subordinates,
          memberName: member.name,
        });
        setShowMigration(true);
        return;
      }
    } catch (error) {
      console.error('Error checking dependencies:', error);
    }

    const confirmRemove = window.confirm(
      `Remove ${member.name} (${member.email}) from workspace?`
    );
    if (!confirmRemove) return;
    try {
      const res = await deleteData(`/workspace/${workspaceId}/members/${member._id}`);
      toast.success(res?.message || 'Employee removed');
      setMembers((prev) => prev.filter((m) => m._id !== member._id));
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, 'Failed to remove employee', {
          403: 'Only owners and admins can remove members',
          404: 'Member not found in this workspace',
          400: 'Cannot remove the owner. Transfer ownership first.',
        })
      );
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showMigration) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-sm text-gray-600">
          <p className="mb-2">
            <span className="font-semibold">{migrationData.memberName}</span> cannot be removed yet
            because they have:
          </p>
          <ul className="list-disc list-inside pl-2 mb-4">
            {migrationData.tasks.length > 0 && (
              <li>{migrationData.tasks.length} active tasks (Todo/In Progress/Pending Approval)</li>
            )}
            {migrationData.projects.length > 0 && (
              <li>Lead of {migrationData.projects.length} projects</li>
            )}
            {migrationData.subordinates.length > 0 && (
              <li>{migrationData.subordinates.length} subordinates across projects</li>
            )}
          </ul>
          <p className="mb-2 font-medium text-red-600">
            Please manually reassign these responsibilities before removing the member.
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowMigration(false)}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Invite Row */}
      {showInvite && (
        <div className="bg-white border border-gray-200 rounded-[12px] p-[15px] md:p-[20px]">
          <div className="flex items-center gap-2 mb-[15px]">
            <div className="bg-[#FDEEE0] p-2 rounded-lg">
              <UserPlus className="w-4 h-4 md:w-5 md:h-5 text-[#f2761b]" />
            </div>
            <h2 className="text-[16px] md:text-[18px] font-semibold font-['Inter'] text-[#040110]">
              Add Employee
            </h2>
          </div>
          <div className="flex flex-col md:flex-row md:items-end gap-[10px]">
            <div className="flex-1 space-y-2">
              <Label className="text-[14px] font-medium font-['Inter'] text-[#040110]">
                Employee email <span className="text-red-500">*</span>
              </Label>
              <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                <PopoverAnchor asChild>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setOpenUserSelect(true);
                    }}
                    onFocus={() => setOpenUserSelect(true)}
                    placeholder="name@example.com or search user"
                    aria-required="true"
                    className="h-[40px]"
                    autoComplete="off"
                  />
                </PopoverAnchor>
                <PopoverContent
                  className="p-0 w-[var(--radix-popover-anchor-width)]"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="max-h-[200px] overflow-y-auto p-1">
                    {isSearchingUsers && (
                      <div className="p-2 text-sm text-gray-500 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...
                      </div>
                    )}
                    {!isSearchingUsers && foundUsers.length === 0 && inviteEmail.length > 1 && (
                      <div className="p-2 text-sm text-gray-500 text-center">
                        No registered users found. You can still invite via email.
                      </div>
                    )}
                    {foundUsers.map((u) => (
                      <div
                        key={u._id}
                        className="flex flex-col px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-[#f5f4f9]"
                        onClick={() => {
                          setInviteEmail(u.email);
                          setOpenUserSelect(false);
                        }}
                      >
                        <span className="font-medium text-[#040110]">{u.name}</span>
                        <span className="text-xs text-[#717182]">{u.email}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-full md:w-[180px] space-y-2">
              <Label className="text-[14px] font-medium font-['Inter'] text-[#040110]">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger className="h-[40px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] font-['Inter'] text-[14px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="font-['Inter'] text-[14px]">
                  <SelectItem value="member">Employee</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  {/* Viewer role is deprecated in UI; commented out intentionally */}
                  {/** <SelectItem value="viewer">Viewer</SelectItem> **/}
                  {/* Head renamed to Lead in UI; keep backend value for compatibility */}
                  {/* <SelectItem value="head">Lead</SelectItem> */}
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleInvite}
              disabled={inviting}
              className="w-full md:w-auto bg-[#f2761b] hover:bg-[#d96816] text-white font-['Inter'] h-[40px]"
              aria-disabled={inviting}
            >
              {inviting ? 'Adding…' : 'Add Employee'}
            </Button>
          </div>
          <p className="text-[12px] text-[#717182] mt-[10px]">
            Employee can collaborate; Admin can manage employees and projects.
          </p>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white border border-gray-200 rounded-[12px] p-[15px] md:p-[20px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[10px] mb-[15px]">
          <h2 className="text-[16px] md:text-[18px] font-semibold font-['Inter'] text-[#040110]">
            Members ({members.length})
          </h2>
          <div className="flex items-center gap-[10px] px-[10px] py-[8px] bg-[rgba(4,1,16,0.05)] rounded-[8px] w-full md:w-[280px]">
            <Search size={15} className="text-[#717182]" />
            <Input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-[14px] text-[#040110] font-['Inter'] placeholder:text-[rgba(4,1,16,0.6)] p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {loadingMembers ? (
          <div className="flex items-center text-sm text-[#717182] py-[40px] justify-center">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading employees…
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-sm text-[#717182] py-[40px] text-center">
            No employees found for this workspace.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {filteredMembers.map((member) => (
              <div key={member._id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-[10px] min-w-0">
                    <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-b from-[#344BFD] to-[#4A8CD7] flex items-center justify-center shrink-0">
                      <span className="text-white text-[14px] font-medium">
                        {member.name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[14px] text-[#040110] truncate">
                        {member.name}
                      </div>
                      <div className="text-[12px] text-[#717182] truncate">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={member.role}
                      onValueChange={(val) => handleRoleChange(member, val as Role)}
                      disabled={member.role === 'owner'}
                    >
                      <SelectTrigger className="h-[34px] border-[#d5d7da] rounded-[8px] px-[10px] py-[6px] font-['Inter'] text-[13px]">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent className="font-['Inter'] text-[13px]">
                        <SelectItem value="member">Employee</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                        {/* Viewer role is deprecated in UI; commented out intentionally */}
                        {/** <SelectItem value="viewer">Viewer</SelectItem> **/}
                        {/* Head renamed to Lead in UI; keep backend value for compatibility */}
                        {/* <SelectItem value="head">Lead</SelectItem> */}
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      className="px-2 h-[34px] text-red-600 hover:text-red-700"
                      aria-label={`Remove ${member.name}`}
                      disabled={member.role === 'owner'}
                      onClick={() => handleRemoveMember(member)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="w-full mt-2 text-[12px] text-[#717182]">
                  {roleDescriptions[member.role] || ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceMembersManager;
