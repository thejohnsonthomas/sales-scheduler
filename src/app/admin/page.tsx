'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Nav } from '@/components/Nav';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Role } from '@prisma/client';

export default function AdminPage() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<Record<string, unknown> | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<string>(Role.ACCOUNT_EXECUTIVE);

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const { data: segmentsData } = useQuery({
    queryKey: ['segments'],
    queryFn: () => fetch('/api/segments').then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const { data: regionsData } = useQuery({
    queryKey: ['regions'],
    queryFn: () => fetch('/api/regions').then((r) => r.json()),
    enabled: status === 'authenticated',
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload: { email: string; name?: string; role: string }) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to add user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole(Role.ACCOUNT_EXECUTIVE);
    },
  });

  const users = usersData?.users ?? [];
  const segments = segmentsData?.segments ?? [];
  const regions = regionsData?.regions ?? [];

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Users</h2>
            <button
              type="button"
              onClick={() => setShowAddUser(true)}
              className="btn-primary"
            >
              Add User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Enabled</th>
                  <th className="text-left py-2">Segments</th>
                  <th className="text-left py-2">Regions</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: {
                  id: string;
                  email: string;
                  name: string | null;
                  role: string;
                  enabled: boolean;
                  userSegments: { segment: { name: string } }[];
                  userRegions: { region: { name: string } }[];
                }) => (
                  <tr key={u.id} className="border-b border-[var(--border)]">
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{u.name ?? '-'}</td>
                    <td className="py-2">{u.role}</td>
                    <td className="py-2">{u.enabled ? 'Yes' : 'No'}</td>
                    <td className="py-2">
                      {u.userSegments.map((us) => us.segment.name).join(', ') || '-'}
                    </td>
                    <td className="py-2">
                      {u.userRegions.map((ur) => ur.region.name).join(', ') || '-'}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() =>
                          setEditingUser({
                            userId: u.id,
                            email: u.email,
                            role: u.role,
                            enabled: u.enabled,
                            segmentIds: u.userSegments.map((us) => (us as unknown as { segment: { id: string } }).segment.id),
                            regionIds: u.userRegions.map((ur) => (ur as unknown as { region: { id: string } }).region.id),
                            maxMeetingsPerDay: (u as { capacityLimits?: { maxMeetingsPerDay: number } }).capacityLimits?.maxMeetingsPerDay ?? 6,
                            maxMeetingsPerWeek: (u as { capacityLimits?: { maxMeetingsPerWeek: number } }).capacityLimits?.maxMeetingsPerWeek ?? 25,
                          })
                        }
                        className="text-[var(--accent)] hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showAddUser && (
          <div className="card fixed inset-0 m-auto max-w-lg max-h-[90vh] overflow-y-auto z-10 bg-[var(--card)]">
            <h2 className="font-semibold mb-4">Add User (AE or SE)</h2>
            <p className="text-sm text-[var(--muted)] mb-4">
              Enter the user&apos;s work email. They will sign in with Google; after first login they can be assigned segments and regions here.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Email *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="input"
                  placeholder="colleague@company.com"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Name (optional)</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="input"
                  placeholder="Display name"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="input"
                >
                  <option value={Role.ACCOUNT_EXECUTIVE}>Account Executive</option>
                  <option value={Role.SOLUTION_ENGINEER}>Solution Engineer</option>
                  <option value={Role.ADMIN}>Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    createUserMutation.mutate({
                      email: newUserEmail.trim(),
                      name: newUserName.trim() || undefined,
                      role: newUserRole,
                    });
                  }}
                  disabled={!newUserEmail.trim() || createUserMutation.isPending}
                  className="btn-primary"
                >
                  {createUserMutation.isPending ? 'Adding...' : 'Add User'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUserEmail('');
                    setNewUserName('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
              {createUserMutation.isError && (
                <p className="text-sm text-[var(--danger)]">
                  {(createUserMutation.error as Error).message}
                </p>
              )}
            </div>
          </div>
        )}

        {editingUser && (
          <div className="card fixed inset-0 m-auto max-w-lg max-h-[90vh] overflow-y-auto z-10">
            <h2 className="font-semibold mb-4">Edit User: {String(editingUser.email)}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Role</label>
                <select
                  value={(editingUser.role as string) ?? ''}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value })
                  }
                  className="input"
                >
                  <option value={Role.ADMIN}>Admin</option>
                  <option value={Role.SOLUTION_ENGINEER}>Solution Engineer</option>
                  <option value={Role.ACCOUNT_EXECUTIVE}>Account Executive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Enabled</label>
                <input
                  type="checkbox"
                  checked={(editingUser.enabled as boolean) ?? true}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, enabled: e.target.checked })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Segments</label>
                <div className="flex flex-wrap gap-2">
                  {segments.map((s: { id: string; name: string }) => (
                    <label key={s.id} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={(editingUser.segmentIds as string[])?.includes(s.id)}
                        onChange={(e) => {
                          const ids = (editingUser.segmentIds as string[]) ?? [];
                          const next = e.target.checked
                            ? [...ids, s.id]
                            : ids.filter((id) => id !== s.id);
                          setEditingUser({ ...editingUser, segmentIds: next });
                        }}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Regions</label>
                <div className="flex flex-wrap gap-2">
                  {regions.map((r: { id: string; name: string }) => (
                    <label key={r.id} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={(editingUser.regionIds as string[])?.includes(r.id)}
                        onChange={(e) => {
                          const ids = (editingUser.regionIds as string[]) ?? [];
                          const next = e.target.checked
                            ? [...ids, r.id]
                            : ids.filter((id) => id !== r.id);
                          setEditingUser({ ...editingUser, regionIds: next });
                        }}
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
              {(editingUser.role === 'SOLUTION_ENGINEER') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Max Meetings/Day</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={(editingUser.maxMeetingsPerDay as number) ?? 6}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, maxMeetingsPerDay: parseInt(e.target.value) || 6 })
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Max Meetings/Week</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={(editingUser.maxMeetingsPerWeek as number) ?? 25}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, maxMeetingsPerWeek: parseInt(e.target.value) || 25 })
                      }
                      className="input"
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    updateMutation.mutate({
                      userId: editingUser.userId,
                      role: editingUser.role,
                      enabled: editingUser.enabled,
                      segmentIds: editingUser.segmentIds,
                      regionIds: editingUser.regionIds,
                      ...(editingUser.role === 'SOLUTION_ENGINEER' && {
                        maxMeetingsPerDay: editingUser.maxMeetingsPerDay,
                        maxMeetingsPerWeek: editingUser.maxMeetingsPerWeek,
                      }),
                    })
                  }
                  disabled={updateMutation.isPending}
                  className="btn-primary"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
