import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { projectsApi, usersApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    List,
    Loader2,
    Search,
    Filter,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Calendar,
    AlertCircle
} from 'lucide-react';
import { cn, formatDate, getInitials, getSeverityColor } from '../lib/utils';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/project-gemini/project-03/backend'}/api`;

const typeConfig = {
    epic: { emoji: '⚡', color: 'bg-purple-500/20 text-purple-400', label: 'Epic' },
    story: { emoji: '📖', color: 'bg-green-500/20 text-green-400', label: 'Story' },
    task: { emoji: '✅', color: 'bg-blue-500/20 text-blue-400', label: 'Task' },
    bug: { emoji: '🐛', color: 'bg-red-500/20 text-red-400', label: 'Bug' },
};

export default function ListView() {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        search: '',
        type: '',
        severity: '',
        status: '',
        assignee_id: '',
        project_id: '',
    });
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');

    // Fetch all tasks
    const { data: tasksData, isLoading } = useQuery({
        queryKey: ['all-tasks', filters, sortBy, sortDir],
        queryFn: () => {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.type) params.append('type', filters.type);
            if (filters.severity) params.append('severity', filters.severity);
            if (filters.status) params.append('status', filters.status);
            if (filters.assignee_id) params.append('assignee_id', filters.assignee_id);
            if (filters.project_id) params.append('project_id', filters.project_id);
            params.append('sort_by', sortBy);
            params.append('sort_dir', sortDir);

            return fetch(`${API_BASE}/tasks/list.php?${params}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            }).then(res => res.json());
        },
    });
    const tasks = tasksData?.data || [];

    // Fetch projects for filter
    const { data: projectsData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll(),
    });
    const projects = projectsData?.data?.data || [];

    // Fetch users for filter (using basic list that works for all users)
    const { data: usersData } = useQuery({
        queryKey: ['users-basic'],
        queryFn: () => usersApi.getBasicList(),
    });
    const users = usersData?.data?.data?.users || [];

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <List className="w-6 h-6 text-primary" />
                        All Issues
                    </h1>
                    <p className="text-text-muted">Lihat semua task dalam format tabel</p>
                </div>
                <div className="text-sm text-text-muted">
                    Total: <span className="text-white font-medium">{tasks.length}</span> issues
                </div>
            </div>

            {/* Filters */}
            <div className="glass rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Filter className="w-4 h-4 text-text-muted" />

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Cari task..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Project Filter */}
                    <select
                        value={filters.project_id}
                        onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
                        className="px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                    >
                        <option value="">Semua Project</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    {/* Type Filter */}
                    <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                    >
                        <option value="">Semua Type</option>
                        <option value="epic">⚡ Epic</option>
                        <option value="story">📖 Story</option>
                        <option value="task">✅ Task</option>
                        <option value="bug">🐛 Bug</option>
                    </select>

                    {/* Severity Filter */}
                    <select
                        value={filters.severity}
                        onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                        className="px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                    >
                        <option value="">Semua Priority</option>
                        <option value="critical">Critical</option>
                        <option value="major">Major</option>
                        <option value="minor">Minor</option>
                    </select>

                    {/* Assignee Filter */}
                    <select
                        value={filters.assignee_id}
                        onChange={(e) => setFilters({ ...filters, assignee_id: e.target.value })}
                        className="px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                    >
                        <option value="">Semua Assignee</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="glass rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-12 text-text-muted">
                        Tidak ada task ditemukan
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface/50 border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <button onClick={() => handleSort('type')} className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-white">
                                            Type <SortIcon field="type" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button onClick={() => handleSort('title')} className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-white">
                                            Title <SortIcon field="title" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button onClick={() => handleSort('project_name')} className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-white">
                                            Project <SortIcon field="project_name" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button onClick={() => handleSort('column_name')} className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-white">
                                            Status <SortIcon field="column_name" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button onClick={() => handleSort('severity')} className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-white">
                                            Priority <SortIcon field="severity" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button onClick={() => handleSort('assignee_name')} className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-white">
                                            Assignee <SortIcon field="assignee_name" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button onClick={() => handleSort('due_date')} className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-white">
                                            Due Date <SortIcon field="due_date" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <span className="text-xs font-medium text-text-muted">Progress</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {tasks.map((task) => {
                                    const type = typeConfig[task.type] || typeConfig.task;
                                    const isOverdue = task.due_date && new Date(task.due_date) < new Date();

                                    return (
                                        <tr key={task.id} className="hover:bg-surface/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className={cn("text-xs px-2 py-1 rounded font-medium", type.color)}>
                                                    {type.emoji} {type.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    to={`/projects/${task.project_id}`}
                                                    className="text-white font-medium hover:text-primary transition-colors"
                                                >
                                                    {task.title}
                                                </Link>
                                                {task.description && (
                                                    <p className="text-xs text-text-muted truncate max-w-xs">{task.description}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-text-muted">{task.project_name}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs px-2 py-1 rounded bg-surface text-white">
                                                    {task.column_name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 text-xs px-2 py-1 rounded border",
                                                    getSeverityColor(task.severity)
                                                )}>
                                                    <AlertCircle className="w-3 h-3" />
                                                    {task.severity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {task.assignee_name ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                                                            {getInitials(task.assignee_name)}
                                                        </div>
                                                        <span className="text-sm text-white">{task.assignee_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {task.due_date ? (
                                                    <span className={cn(
                                                        "flex items-center gap-1 text-sm",
                                                        isOverdue ? "text-red-400" : "text-text-muted"
                                                    )}>
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(task.due_date)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-surface rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full"
                                                            style={{ width: `${task.status_actual || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-text-muted">{task.status_actual || 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
