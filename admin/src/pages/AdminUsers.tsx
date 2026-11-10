import React, { useState, useEffect } from 'react';
import { api, AdminUser, toast } from '../api/client';
import { AdminUsersSkeleton } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  KeyRound,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Lock,
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Create User State
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const list = await api.getUsers();
      setUsers(list);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch admin users.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      setChangingPass(true);
      await api.changePassword({ currentPassword, newPassword });
      const passText = 'Password successfully updated!';
      setMessage({ type: 'success', text: passText });
      toast.success(passText, 'Security Updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setChangingPass(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newUsername.trim().length < 3) {
      setMessage({ type: 'error', text: 'Username must be at least 3 characters.' });
      return;
    }
    if (newUserPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      setCreatingUser(true);
      const created = await api.createUser({
        username: newUsername.trim(),
        password: newUserPassword,
      });
      const userText = `Admin user '${created.username}' created successfully.`;
      setMessage({ type: 'success', text: userText });
      toast.success(userText, 'Admin User Created');
      setNewUsername('');
      setNewUserPassword('');
      loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create admin user.' });
    } finally {
      setCreatingUser(false);
    }
  };

  if (loading && users.length === 0) {
    return <AdminUsersSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
          <Users className="w-5 h-5 text-blue-400" />
          Admin Accounts & Security
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage administrator credentials, session authentication, and access control.
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center gap-2.5 border ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
              : 'bg-red-950/40 border-red-800/40 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Change Password & Create New Admin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form 1: Change Current Password */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-slate-100">
              Update Password for &quot;{currentUser?.username}&quot;
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                id="current-password-input"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                id="new-password-input"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                id="confirm-new-password-input"
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>

            <button
              id="change-password-submit-btn"
              type="submit"
              disabled={changingPass}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
            >
              {changingPass ? 'Updating Password...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Form 2: Create Additional Admin User */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-100">Create New Administrator Account</h2>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                New Admin Username
              </label>
              <input
                id="new-admin-username-input"
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. devops_admin"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Temporary Password
              </label>
              <input
                id="new-admin-password-input"
                type="password"
                required
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>

            <div className="pt-5">
              <button
                id="create-admin-submit-btn"
                type="submit"
                disabled={creatingUser}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
              >
                {creatingUser ? 'Creating Account...' : 'Provision Admin User'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Table: Existing Admin Accounts */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Active Administrator Directory ({users.length})
          </div>
          <span className="text-[11px] text-slate-500">HttpOnly Session Storage Policy</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Created Date</th>
                <th className="py-2.5 px-3">Last Login</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/50 text-slate-300">
                  <td className="py-2.5 px-3 font-semibold text-slate-100 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-blue-400 font-bold flex items-center justify-center text-[10px] uppercase">
                      {u.username[0]}
                    </div>
                    <span>{u.username}</span>
                    {u.username === currentUser?.username && (
                      <span className="text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                        (You)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">Master Administrator</td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never logged in'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
