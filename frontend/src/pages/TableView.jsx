import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { projectsApi } from '../lib/api';
import {
    ArrowLeft,
    Table2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Search,
    Filter,
    Loader2,
    Edit,
    CheckCircle,
    Clock,
    AlertCircle
} from 'lucide-react';
import { cn, formatDate, getInitials } from '../lib/utils';

import { API_URL } from '../lib/api';
const API_BASE = `${API_URL}/api`;

export default function TableView() {
    const { projectId } = useParams();
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Get project info
    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectsApi.getById(projectId),
    });
    const project = projectData?.data?.data;

    // Get all tasks for the project
    const { data: tasksData, isLoading } = useQuery({
        queryKey: ['table-tasks', projectId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/tasks/list.php?project_id=${projectId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            });
            return res.json();
        },
    });
    const allTasks = tasksData?.data || [];

    // Filter and sort tasks
    const tasks = useMemo(() => {
        let filtered = [...allTasks];

        // Search filter
        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(s) ||
                t.description?.toLowerCase().includes(s)
            );
        }

        // Type filter
        if (filterType) {
            filtered = filtered.filter(t => t.type === filterType);
        }

        // Status filter (by column)
        if (filterStatus) {
            filtered = filtered.filter(t => t.column_name?.toLowerCase().includes(filterStatus.toLowerCase()));
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (sortField.includes('date')) {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            }

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            if (sortDir === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return filtered;
    }, [allTasks, search, filterType, filterStatus, sortField, sortDir]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const SortButton = ({ field, children }) => (
        <button
            onClick={() => handleSort(field)}
            className="flex items-center gap-1 hover:text-primary transition-colors"
        >
            {children}
            {sortField === field ? (
                sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
            ) : (
                <ArrowUpDown className="w-3 h-3 opacity-50" />
            )}
        </button>
    );

    const typeColors = {
        epic: 'bg-purple-500/20 text-purple-400',
        story: 'bg-green-500/20 text-green-400',
        task: 'bg-blue-500/20 text-blue-400',
        bug: 'bg-red-500/20 text-red-400',
    };

    const severityIcons = {
        minor: <CheckCircle className="w-4 h-4 text-green-400" />,
        major: <Clock className="w-4 h-4 text-yellow-400" />,
        critical: <AlertCircle className="w-4 h-4 text-red-400" />,
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/projects"
                        className="p-2 hover:bg-surface rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-text-muted" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white">{project?.name}</h1>
                        <p className="text-sm text-text-muted">Table View</p>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 bg-surface rounded-xl p-1">
                    <Link
                        to={`/projects/${projectId}`}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-surface-light transition-colors"
                    >
                        📋 Board
                    </Link>
                    <Link
                        to={`/projects/${projectId}/backlog`}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-surface-light transition-colors"
                    >
                        📦 Backlog
                    </Link>
                    <Link
                        to={`/projects/${projectId}/timeline`}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-surface-light transition-colors"
                    >
                        📊 Timeline
                    </Link>
                    <Link
                        to={`/projects/${projectId}/table`}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white"
                    >
                        📋 Table
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search tasks..."
                        className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                </div>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 bg-surface border border-border rounded-lg text-white focus:outline-none focus:border-primary"
                >
                    <option value="">All Types</option>
                    <option value="epic">Epic</option>
                    <option value="story">Story</option>
                    <option value="task">Task</option>
                    <option value="bug">Bug</option>
                </select>

                <div className="text-sm text-text-muted">
                    {tasks.length} of {allTasks.length} tasks
                </div>
            </div>

            {/* Table */}
            <div className="glass rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surface/50 border-b border-border">
                            <tr>
                                <th className="text-left p-4 text-sm font-medium text-text-muted">
                                    <SortButton field="title">Title</SortButton>
                                </th>
                                <th className="text-left p-4 text-sm font-medium text-text-muted w-24">
                                    <SortButton field="type">Type</SortButton>
                                </th>
                                <th className="text-left p-4 text-sm font-medium text-text-muted w-24">
                                    Severity
                                </th>
                                <th className="text-left p-4 text-sm font-medium text-text-muted w-32">
                                    <SortButton field="column_name">Status</SortButton>
                                </th>
                                <th className="text-left p-4 text-sm font-medium text-text-muted w-32">
                                    Assignee
                                </th>
                                <th className="text-left p-4 text-sm font-medium text-text-muted w-28">
                                    <SortButton field="start_date">Start</SortButton>
                                </th>
                                <th className="text-left p-4 text-sm font-medium text-text-muted w-28">
                                    <SortButton field="due_date">Due</SortButton>
                                </th>
                                <th className="text-left p-4 text-sm font-medium text-text-muted w-20">
                                    Progress
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : tasks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-text-muted">
                                        No tasks found
                                    </td>
                                </tr>
                            ) : (
                                tasks.map((task) => {
                                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.column_name?.toLowerCase() !== 'done';

                                    return (
                                        <tr
                                            key={task.id}
                                            className="border-b border-border hover:bg-surface/30 transition-colors cursor-pointer"
                                        >
                                            <td className="p-4">
                                                <p className="text-white font-medium">{task.title}</p>
                                                {task.description && (
                                                    <p className="text-xs text-text-muted truncate max-w-md">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-medium capitalize",
                                                    typeColors[task.type] || typeColors.task
                                                )}>
                                                    {task.type || 'task'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1">
                                                    {severityIcons[task.severity] || severityIcons.minor}
                                                    <span className="text-sm text-text-muted capitalize">
                                                        {task.severity || 'minor'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-surface rounded text-sm text-white">
                                                    {task.column_name}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {task.assignee_name ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium">
                                                            {getInitials(task.assignee_name)}
                                                        </div>
                                                        <span className="text-sm text-white">
                                                            {task.assignee_name.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-text-muted text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm text-text-muted">
                                                    {task.start_date ? formatDate(task.start_date) : '-'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "text-sm",
                                                    isOverdue ? "text-red-400" : "text-text-muted"
                                                )}>
                                                    {task.due_date ? formatDate(task.due_date) : '-'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="w-full bg-surface rounded-full h-2">
                                                    <div
                                                        className="bg-primary h-2 rounded-full transition-all"
                                                        style={{ width: `${task.status_actual || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-text-muted">
                                                    {task.status_actual || 0}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
