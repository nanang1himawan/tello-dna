import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    Briefcase,
    Plus,
    Edit,
    Trash2,
    Loader2,
    X,
    Users,
    Palette
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Departments() {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);

    // Fetch departments
    const { data, isLoading, error } = useQuery({
        queryKey: ['departments'],
        queryFn: () => departmentsApi.getAll(),
    });

    const departments = data?.data?.data || [];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => departmentsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['departments']);
        },
    });

    const handleDelete = (department) => {
        if (confirm(`Hapus bidang "${department.name}"?`)) {
            deleteMutation.mutate(department.id);
        }
    };

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <Briefcase className="w-16 h-16 text-text-muted mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Akses Ditolak</h2>
                <p className="text-text-muted">Hanya admin yang dapat mengelola bidang keahlian.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-primary" />
                        Bidang Keahlian
                    </h1>
                    <p className="text-text-muted">Kelola departemen dan bidang keahlian staff</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 gradient-primary text-white font-medium rounded-xl btn-hover flex items-center gap-2 self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Bidang
                </button>
            </div>

            {/* Departments Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : error ? (
                <div className="text-center py-12 text-red-400">
                    Error loading departments. Please try again.
                </div>
            ) : departments.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                    Belum ada bidang keahlian. Klik "Tambah Bidang" untuk membuat.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map((dept) => (
                        <div
                            key={dept.id}
                            className="glass rounded-xl p-5 card-hover group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${dept.color}20` }}
                                >
                                    <Briefcase className="w-5 h-5" style={{ color: dept.color }} />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setEditingDepartment(dept)}
                                        className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted hover:text-white"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(dept)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-text-muted hover:text-red-400"
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-semibold text-white mb-1">{dept.name}</h3>
                            {dept.description && (
                                <p className="text-sm text-text-muted mb-3 line-clamp-2">{dept.description}</p>
                            )}

                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                <Users className="w-4 h-4" />
                                <span>{dept.member_count || 0} anggota</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || editingDepartment) && (
                <DepartmentModal
                    department={editingDepartment}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingDepartment(null);
                    }}
                />
            )}
        </div>
    );
}

function DepartmentModal({ department, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: department?.name || '',
        color: department?.color || '#6366f1',
        description: department?.description || '',
    });
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: (data) => department
            ? departmentsApi.update(department.id, data)
            : departmentsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['departments']);
            onClose();
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Terjadi kesalahan');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    const presetColors = [
        '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b',
        '#06b6d4', '#6366f1', '#ef4444', '#84cc16', '#f97316'
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl w-full max-w-md animate-fadeIn">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-bold text-white">
                        {department ? 'Edit Bidang' : 'Tambah Bidang Baru'}
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
                        <label className="text-sm font-medium text-text-muted">Nama Bidang</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="contoh: Frontend Developer"
                            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            Warna
                        </label>
                        <div className="flex items-center gap-2 flex-wrap">
                            {presetColors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color })}
                                    className={cn(
                                        "w-8 h-8 rounded-lg transition-all",
                                        formData.color === color && "ring-2 ring-white ring-offset-2 ring-offset-background"
                                    )}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-8 h-8 rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Deskripsi (opsional)</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Deskripsi singkat bidang ini..."
                            rows={3}
                            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary resize-none"
                        />
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
                            {department ? 'Simpan' : 'Tambah'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
