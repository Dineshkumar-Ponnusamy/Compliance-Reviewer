import React, { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const UserProfile: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  if (!user) {
    return null;
  }

  const handleProfileSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setUpdatingProfile(true);
      try {
        updateProfile({ name });
        setProfileMessage('Profile updated.');
      } catch (error: any) {
        setProfileMessage(error?.message ?? 'Unable to update profile.');
      } finally {
        setUpdatingProfile(false);
        window.setTimeout(() => setProfileMessage(null), 2400);
      }
    },
    [name, updateProfile],
  );

  const handlePasswordSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setPasswordError(null);
      setPasswordMessage(null);
      setUpdatingPassword(true);
      try {
        await changePassword({ currentPassword, newPassword });
        setPasswordMessage('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
      } catch (error: any) {
        setPasswordError(error?.message ?? 'Unable to change password.');
      } finally {
        setUpdatingPassword(false);
        window.setTimeout(() => {
          setPasswordMessage(null);
          setPasswordError(null);
        }, 3200);
      }
    },
    [changePassword, currentPassword, newPassword],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-6 rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/30">
        <header>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Account</h1>
          <p className="mt-1 text-sm text-gray-200">Update your profile details and security credentials.</p>
        </header>
        <form className="space-y-4" onSubmit={handleProfileSubmit}>
          <div className="space-y-1">
            <label htmlFor="profile-name" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Display Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="Your name"
              disabled={updatingProfile}
            />
          </div>
          <button
            type="submit"
            disabled={updatingProfile}
            className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {updatingProfile ? 'Saving…' : 'Save Changes'}
          </button>
          {profileMessage && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              {profileMessage}
            </div>
          )}
        </form>
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <div>
            <h2 className="text-sm font-semibold text-gray-100">Change Password</h2>
            <p className="text-xs text-gray-500">Passwords must be at least 8 characters.</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="current-password" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              autoComplete="current-password"
              disabled={updatingPassword}
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              autoComplete="new-password"
              disabled={updatingPassword}
              required
            />
          </div>
          <button
            type="submit"
            disabled={updatingPassword}
            className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {updatingPassword ? 'Updating…' : 'Update Password'}
          </button>
          {passwordMessage && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              {passwordMessage}
            </div>
          )}
          {passwordError && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {passwordError}
            </div>
          )}
        </form>
      </section>
      <aside className="space-y-4">
        <article className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5 text-sm text-gray-300">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Email</dt>
              <dd className="text-gray-100">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Role</dt>
              <dd className="text-gray-100">{user.role.toUpperCase()}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Two-Factor Auth</dt>
              <dd className="text-gray-400">Coming soon — enforcement planned for Q3.</dd>
            </div>
          </dl>
        </article>
        <article className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5 text-sm text-gray-300">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Session Security</h2>
          <p className="mt-2 text-sm text-gray-300">
            Sessions expire after 8 hours of inactivity. On-prem deployments can enforce stricter policies via the
            Compliance Hub configuration file.
          </p>
        </article>
      </aside>
    </div>
  );
};

export default UserProfile;
