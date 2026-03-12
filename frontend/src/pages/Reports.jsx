import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    BarChart3,
    Loader2,
    Filter,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/project-gemini/project-03/backend'}/api`;

const TYPE_COLORS = {
    epic: '#a855f7',
    story: '#22c55e',
    task: '#3b82f6',
    bug: '#ef4444',
};

const SEVERITY_COLORS = {
    critical: '#ef4444',
    major: '#f59e0b',
    minor: '#3b82f6',
};

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export default function Reports() {
    const { user } = useAuth();
    const [selectedProject, setSelectedProject] = useState('');

    // Fetch projects for filter
    const { data: projectsData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll(),
    });
    const projects = projectsData?.data?.data || [];

    // Fetch reports data
    const { data: reportsData, isLoading } = useQuery({
        queryKey: ['reports', selectedProject],
        queryFn: () => {
            const params = new URLSearchParams();
            if (selectedProject) params.append('project_id', selectedProject);

            return fetch(`${API_BASE}/reports/stats.php?${params}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            }).then(res => res.json());
        },
    });
    const data = reportsData?.data || {};

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    const totals = data.totals || {};
    const completionRate = totals.total_tasks > 0
        ? Math.round((totals.completed_tasks / totals.total_tasks) * 100)
        : 0;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-primary" />
                        Reports
                    </h1>
                    <p className="text-text-muted">Analisis dan statistik project</p>
                </div>

                <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-text-muted" />
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                    >
                        <option value="">Semua Project</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-text-muted text-sm">Total Tasks</span>
                        <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-3xl font-bold text-white">{totals.total_tasks || 0}</p>
                </div>

                <div className="glass rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-text-muted text-sm">Completed</span>
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-green-400">{totals.completed_tasks || 0}</p>
                    <p className="text-xs text-text-muted mt-1">{completionRate}% of total</p>
                </div>

                <div className="glass rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-text-muted text-sm">In Progress</span>
                        <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-3xl font-bold text-amber-400">
                        {(totals.total_tasks || 0) - (totals.completed_tasks || 0) - (totals.overdue_tasks || 0)}
                    </p>
                </div>

                <div className="glass rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-text-muted text-sm">Overdue</span>
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-3xl font-bold text-red-400">{totals.overdue_tasks || 0}</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Issues by Status */}
                <div className="glass rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Issues by Status</h3>
                    {data.by_status?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={data.by_status}
                                    dataKey="count"
                                    nameKey="status"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ status, count }) => `${status}: ${count}`}
                                >
                                    {data.by_status.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '8px' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-text-muted py-12">Tidak ada data</p>
                    )}
                </div>

                {/* Issues by Type */}
                <div className="glass rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Issues by Type</h3>
                    {data.by_type?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data.by_type} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                                <XAxis type="number" stroke="#6b7280" />
                                <YAxis dataKey="type" type="category" stroke="#6b7280" width={60} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '8px' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {data.by_type.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.type] || CHART_COLORS[index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-text-muted py-12">Tidak ada data</p>
                    )}
                </div>

                {/* Issues by Severity */}
                <div className="glass rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Issues by Priority</h3>
                    {data.by_severity?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data.by_severity}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                                <XAxis dataKey="severity" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '8px' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {data.by_severity.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || CHART_COLORS[index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-text-muted py-12">Tidak ada data</p>
                    )}
                </div>

                {/* Top Assignees */}
                <div className="glass rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Top Assignees</h3>
                    {data.by_assignee?.length > 0 ? (
                        <div className="space-y-3">
                            {data.by_assignee.map((item, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                                        {item.assignee?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-white text-sm font-medium">{item.assignee}</span>
                                            <span className="text-text-muted text-sm">{item.count} tasks</span>
                                        </div>
                                        <div className="h-2 bg-surface rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${(item.count / data.by_assignee[0].count) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-text-muted py-12">Tidak ada data</p>
                    )}
                </div>
            </div>

            {/* Sprint Progress (if project selected) */}
            {selectedProject && data.sprint_progress?.length > 0 && (
                <div className="glass rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Sprint Progress</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.sprint_progress.map((sprint) => {
                            const progress = sprint.total_tasks > 0
                                ? Math.round((sprint.completed_tasks / sprint.total_tasks) * 100)
                                : 0;

                            return (
                                <div key={sprint.id} className="bg-surface/50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-white">{sprint.name}</span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded",
                                            sprint.status === 'active' && "bg-green-500/20 text-green-400",
                                            sprint.status === 'planning' && "bg-amber-500/20 text-amber-400",
                                            sprint.status === 'completed' && "bg-blue-500/20 text-blue-400"
                                        )}>
                                            {sprint.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-white font-medium">{progress}%</span>
                                    </div>
                                    <p className="text-xs text-text-muted">
                                        {sprint.completed_tasks} / {sprint.total_tasks} tasks completed
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
