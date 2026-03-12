import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, departmentsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    Users as UsersIcon,
    Plus,
    Search,
    Edit,
    Trash2,
    Loader2,
    X,
    Shield,
    Briefcase
} from 'lucide-react';
import { cn, getInitials, getRoleBadgeColor, formatDate } from '../lib/utils';

export default function Users() {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Fetch users
    const { data, isLoading, error } = useQuery({
        queryKey: ['users', searchQuery, roleFilter],
        queryFn: () => usersApi.getAll({ search: searchQuery, role: roleFilter }),
    });

    const users = data?.data?.data?.users || [];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => usersApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
        },
    });

    const handleDelete = (user) => {
        if (confirm(`Hapus user "${user.name}"?`)) {
            deleteMutation.mutate(user.id);
        }
    };

    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <Shield className="w-16 h-16 text-text-muted mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Akses Ditolak</h2>
                <p className="text-text-muted">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <UsersIcon className="w-6 h-6 text-primary" />
                        Manajemen User
                    </h1>
                    <p className="text-text-muted">Kelola akun pengguna dan hak aksesnya</p>
                </div>
                {currentUser?.role === 'admin' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 gradient-primary text-white font-medium rounded-xl btn-hover flex items-center gap-2 self-start sm:self-auto"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah User
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Cari nama atau email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-xl text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary transition-colors"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                >
                    <option value="">Semua Role</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="glass rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-400">
                        Error loading users. Please try again.
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12 text-text-muted">
                        Tidak ada user ditemukan.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface/50 border-b border-border">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">User</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Email</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Role & Bidang</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Bergabung</th>
                                    <th className="text-right px-6 py-4 text-sm font-medium text-text-muted">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-surface/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                                                    {getInitials(user.name)}
                                                </div>
                                                <span className="font-medium text-white">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-text-muted">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-lg text-xs font-medium border capitalize w-fit",
                                                    getRoleBadgeColor(user.role)
                                                )}>
                                                    {user.role}
                                                </span>
                                                {user.department_name && (
                                                    <span
                                                        className="px-2 py-1 rounded-lg text-xs font-medium w-fit flex items-center gap-1"
                                                        style={{
                                                            backgroundColor: `${user.department_color || '#6366f1'}20`,
                                                            color: user.department_color || '#6366f1'
                                                        }}
                                                    >
                                                        <Briefcase className="w-3 h-3" />
                                                        {user.department_name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-text-muted text-sm">
                                            {formatDate(user.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted hover:text-white"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {currentUser?.role === 'admin' && user.id !== currentUser.id && (
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-text-muted hover:text-red-400"
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || editingUser) && (
                <UserModal
                    user={editingUser}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingUser(null);
                    }}
                />
            )}
        </div>
    );
}

function UserModal({ user, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        role: user?.role || 'staff',
        department_id: user?.department_id || '',
    });
    const [error, setError] = useState('');

    // Fetch departments
    const { data: deptData } = useQuery({
        queryKey: ['departments'],
        queryFn: () => departmentsApi.getAll(),
    });
    const departments = deptData?.data?.data || [];

    const mutation = useMutation({
        mutationFn: (data) => user ? usersApi.update(user.id, data) : usersApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            onClose();
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Terjadi kesalahan');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = { ...formData };
        if (!data.password) delete data.password;
        if (!data.department_id) data.department_id = null;
        mutation.mutate(data);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl w-full max-w-md animate-fadeIn max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 glass">
                    <h2 className="text-lg font-bold text-white">
                        {user ? 'Edit User' : 'Tambah User Baru'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-danger/10 border border-danger/30 text-red-400 text-sm rounded-lg p-3">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Nama</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">
                            Password {user && '(kosongkan jika tidak diubah)'}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                            required={!user}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                            >
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                Bidang
                            </label>
                            <select
                                value={formData.department_id}
                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                            >
                                <option value="">-- Pilih Bidang --</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-surface border border-border text-white rounded-xl hover:bg-surface-light transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-1 px-4 py-2 gradient-primary text-white rounded-xl btn-hover disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            {user ? 'Simpan' : 'Tambah'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
