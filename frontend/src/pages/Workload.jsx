import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
    Users,
    Loader2,
    CheckCircle2,
    Clock,
    AlertTriangle,
    AlertCircle,
    BarChart3,
    Filter,
    FolderKanban,
    User,
    X
} from 'lucide-react';
import { cn, getInitials } from '../lib/utils';

export default function Workload() {
    const { user: currentUser } = useAuth();
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedProject, setSelectedProject] = useState('');

    // Build query params
    const buildUrl = () => {
        const base = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/project-gemini/project-03/backend'}/api/users/workload.php`;
        const params = new URLSearchParams();
        if (selectedUser) params.set('user_id', selectedUser);
        if (selectedProject) params.set('project_id', selectedProject);
        const qs = params.toString();
        return qs ? `${base}?${qs}` : base;
    };

    // Fetch workload data
    const { data, isLoading, error } = useQuery({
        queryKey: ['workload', selectedUser, selectedProject],
        queryFn: () => fetch(buildUrl(), {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }).then(res => res.json()),
        enabled: currentUser?.role === 'admin' || currentUser?.role === 'manager',
    });

    const users = data?.data?.users || [];
    const allUsers = data?.data?.all_users || [];
    const projects = data?.data?.projects || [];

    // Calculate totals
    const totals = users.reduce((acc, user) => ({
        total: acc.total + user.total_tasks,
        completed: acc.completed + user.completed_tasks,
        inProgress: acc.inProgress + user.in_progress_tasks,
        overdue: acc.overdue + user.overdue_tasks,
        critical: acc.critical + user.critical_tasks,
    }), { total: 0, completed: 0, inProgress: 0, overdue: 0, critical: 0 });

    const hasActiveFilters = selectedUser || selectedProject;

    const clearFilters = () => {
        setSelectedUser('');
        setSelectedProject('');
    };

    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Akses Ditolak</h3>
                <p className="text-text-muted">Halaman ini hanya untuk Admin dan Manager</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    Team Workload
                </h1>
                <p className="text-text-muted">
                    {currentUser?.role === 'admin'
                        ? 'Lihat beban kerja seluruh tim'
                        : 'Lihat beban kerja tim di project Anda'}
                </p>
            </div>

            {/* Filter Bar */}
            <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-text-muted text-sm">
                        <Filter className="w-4 h-4" />
                        <span className="font-medium">Filter</span>
                    </div>

                    {/* User Filter */}
                    <div className="relative flex-1 min-w-[180px] max-w-[280px]">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-white appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                        >
                            <option value="">Semua User</option>
                            {allUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                    </div>

                    {/* Project Filter */}
                    <div className="relative flex-1 min-w-[180px] max-w-[280px]">
                        <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-white appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                        >
                            <option value="">Semua Project</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                            <span>Reset</span>
                        </button>
                    )}
                </div>

                {/* Active filter badges */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <span className="text-xs text-text-muted">Aktif:</span>
                        {selectedUser && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/30 rounded-full">
                                <User className="w-3 h-3" />
                                {allUsers.find(u => u.id == selectedUser)?.name || 'User'}
                                <button onClick={() => setSelectedUser('')} className="hover:text-white transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {selectedProject && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-full">
                                <FolderKanban className="w-3 h-3" />
                                {projects.find(p => p.id == selectedProject)?.name || 'Project'}
                                <button onClick={() => setSelectedProject('')} className="hover:text-white transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 text-text-muted mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">Total Tasks</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{totals.total}</p>
                </div>
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">Selesai</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{totals.completed}</p>
                </div>
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">In Progress</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{totals.inProgress}</p>
                </div>
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">Overdue</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{totals.overdue}</p>
                </div>
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-500 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">Critical</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">{totals.critical}</p>
                </div>
            </div>

            {/* User Workload List */}
            <div className="glass rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-semibold text-white">
                        Beban Kerja per User ({users.length} user)
                        {selectedProject && (
                            <span className="text-sm font-normal text-text-muted ml-2">
                                — Project: {projects.find(p => p.id == selectedProject)?.name}
                            </span>
                        )}
                    </h2>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-400">Error loading data</div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12 text-text-muted">
                        {hasActiveFilters ? 'Tidak ada data untuk filter yang dipilih' : 'Tidak ada data'}
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {users.map((user) => (
                            <div key={user.id} className="p-4 hover:bg-surface/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium flex-shrink-0">
                                        {getInitials(user.name)}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-medium text-white truncate">{user.name}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded bg-surface text-text-muted capitalize">
                                                {user.role}
                                            </span>
                                        </div>
                                        <p className="text-sm text-text-muted truncate">{user.email}</p>
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden md:flex items-center gap-6 text-sm">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-white">{user.total_tasks}</p>
                                            <p className="text-text-muted text-xs">Total</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-amber-400">{user.pending_tasks}</p>
                                            <p className="text-text-muted text-xs">Pending</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-green-400">{user.completed_tasks}</p>
                                            <p className="text-text-muted text-xs">Done</p>
                                        </div>
                                        {user.overdue_tasks > 0 && (
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-red-400">{user.overdue_tasks}</p>
                                                <p className="text-text-muted text-xs">Overdue</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-32 hidden lg:block">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-text-muted">Progress</span>
                                            <span className="text-white font-medium">{user.completion_rate}%</span>
                                        </div>
                                        <div className="h-2 bg-surface rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    user.completion_rate >= 75 ? "bg-green-500" :
                                                        user.completion_rate >= 50 ? "bg-amber-500" :
                                                            "bg-red-500"
                                                )}
                                                style={{ width: `${user.completion_rate}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Workload Indicator */}
                                    <div className="flex-shrink-0">
                                        {user.pending_tasks === 0 ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                                                Free
                                            </span>
                                        ) : user.pending_tasks <= 3 ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                                Low
                                            </span>
                                        ) : user.pending_tasks <= 7 ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                                Medium
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                                                High
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Mobile Stats */}
                                <div className="flex md:hidden items-center gap-4 mt-3 text-xs">
                                    <span className="text-text-muted">Total: <span className="text-white font-medium">{user.total_tasks}</span></span>
                                    <span className="text-text-muted">Pending: <span className="text-amber-400 font-medium">{user.pending_tasks}</span></span>
                                    <span className="text-text-muted">Done: <span className="text-green-400 font-medium">{user.completed_tasks}</span></span>
                                    {user.overdue_tasks > 0 && (
                                        <span className="text-red-400 font-medium">⚠️ {user.overdue_tasks} overdue</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
