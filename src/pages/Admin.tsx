import React, { useMemo, useState } from 'react';
import { AuthUser, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

interface AdminProps {
  users: AuthUser[];
  onRoleChange: (userId: string, role: UserRole) => void;
}

const Admin: React.FC<AdminProps> = ({ users, onRoleChange }) => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totals = users.reduce(
      (acc, current) => {
        acc.total += 1;
        acc[current.role] = (acc[current.role] ?? 0) + 1;
        return acc;
      },
      { total: 0, admin: 0, reviewer: 0 } as Record<UserRole | 'total', number>,
    );
    return totals;
  }, [users]);

  const handleRoleSelect = (userId: string, value: string) => {
    const role = value as UserRole;
    onRoleChange(userId, role);
    const selected = users.find((item) => item.id === userId);
    setFeedback(`Updated ${selected?.email ?? 'user'} to ${role.toUpperCase()} role.`);
    window.setTimeout(() => setFeedback(null), 2200);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/30">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Access Control</h1>
            <p className="text-sm text-gray-200">Manage workspace members, roles, and provisioning.</p>
          </div>
          <div className="flex gap-3 text-xs text-gray-400">
            <span>Total {stats.total}</span>
            <span className="text-cyan-300">Admins {stats.admin}</span>
            <span className="text-emerald-200">Reviewers {stats.reviewer}</span>
          </div>
        </header>
        {feedback && (
          <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            {feedback}
          </div>
        )}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800 text-sm text-gray-200">
            <thead className="bg-gray-900/70 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((member) => {
                const isSelf = user?.id === member.id;
                return (
                  <tr key={member.id} className="odd:bg-gray-900/40 even:bg-gray-900/20">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-100">{member.name || 'Unnamed user'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{member.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={member.role}
                        onChange={(event) => handleRoleSelect(member.id, event.target.value)}
                        className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:cursor-not-allowed"
                        disabled={isSelf}
                      >
                        <option value="admin">Admin</option>
                        <option value="reviewer">Reviewer</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {isSelf ? 'Signed in' : 'Active'}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                    No users registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5 text-sm text-gray-200">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Directory Sync</h2>
          <p className="mt-2 text-sm text-gray-300">
            Upcoming releases add automated provisioning from Active Directory and local signup approvals. Invite links
            and group-based permissions will land in the next sprint.
          </p>
        </article>
        <article className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5 text-sm text-gray-200">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Audit Trail</h2>
          <p className="mt-2 text-sm text-gray-300">
            Role changes are recorded alongside review logs for full traceability. Export to your compliance data lake
            via the upcoming Compliance Hub APIs.
          </p>
        </article>
      </section>
    </div>
  );
};

export default Admin;
