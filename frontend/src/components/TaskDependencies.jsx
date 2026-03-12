import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Link2,
    X,
    Plus,
    Loader2,
    Search,
    ArrowRight,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/project-gemini/project-03/backend'}/api`;

const typeEmojis = {
    epic: '⚡',
    story: '📖',
    task: '✅',
    bug: '🐛'
};

/**
 * TaskDependencies - Manage task blockers and dependencies
 */
export default function TaskDependencies({ taskId, boardId, onClose }) {
    const queryClient = useQueryClient();
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch dependencies
    const { data: depsData, isLoading } = useQuery({
        queryKey: ['task-dependencies', taskId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/tasks/dependencies.php?task_id=${taskId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            });
            return res.json();
        },
        enabled: !!taskId,
    });

    // Fetch available tasks for linking
    const { data: boardData, isLoading: isBoardLoading } = useQuery({
        queryKey: ['board-tasks', boardId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/boards/show.php?id=${boardId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            });
            const json = await res.json();
            console.log('Board data response:', json);
            return json;
        },
        enabled: !!boardId && showSearch,
    });

    // Add dependency
    const addMutation = useMutation({
        mutationFn: async (dependsOnId) => {
            const res = await fetch(`${API_BASE}/tasks/dependencies.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task_id: taskId,
                    depends_on_id: dependsOnId,
                    type: 'blocks'
                })
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['task-dependencies', taskId]);
            setShowSearch(false);
            setSearchQuery('');
        },
    });

    // Remove dependency
    const removeMutation = useMutation({
        mutationFn: async (depId) => {
            await fetch(`${API_BASE}/tasks/dependencies.php?id=${depId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['task-dependencies', taskId]);
        },
    });

    const dependencies = depsData?.data || { blocking: [], blocked_by: [] };
    const hasDependencies = dependencies.blocking?.length > 0 || dependencies.blocked_by?.length > 0;

    // Get all tasks from board for search - handle API response structure
    const boardColumns = boardData?.data?.columns || boardData?.columns || [];
    console.log('Board columns:', boardColumns, 'All board data:', boardData);

    const allTasks = boardColumns.flatMap(col =>
        (col.tasks || []).map(t => ({ ...t, column_name: col.name }))
    ).filter(t => t.id !== taskId && String(t.id) !== String(taskId));

    console.log('All tasks found:', allTasks.length, allTasks);

    const filteredTasks = searchQuery.trim()
        ? allTasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : allTasks;

    const isLoadingTasks = showSearch && isBoardLoading;

    return (
        <div className="w-80 glass rounded-xl p-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    Dependencies
                </h3>
                {onClose && (
                    <button onClick={onClose} className="p-1 hover:bg-surface rounded">
                        <X className="w-4 h-4 text-text-muted" />
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Blocking this task */}
                    {dependencies.blocking?.length > 0 && (
                        <div>
                            <p className="text-xs text-text-muted font-medium mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                Blocked by ({dependencies.blocking.length})
                            </p>
                            <div className="space-y-2">
                                {dependencies.blocking.map(dep => (
                                    <div
                                        key={dep.id}
                                        className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg group"
                                    >
                                        <span className="text-sm">
                                            {typeEmojis[dep.task_type] || '✅'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{dep.task_title}</p>
                                            <p className="text-xs text-text-muted">{dep.column_name}</p>
                                        </div>
                                        <button
                                            onClick={() => removeMutation.mutate(dep.id)}
                                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
                                        >
                                            <X className="w-3 h-3 text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tasks blocked by this */}
                    {dependencies.blocked_by?.length > 0 && (
                        <div>
                            <p className="text-xs text-text-muted font-medium mb-2 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                Blocking ({dependencies.blocked_by.length})
                            </p>
                            <div className="space-y-2">
                                {dependencies.blocked_by.map(dep => (
                                    <div
                                        key={dep.id}
                                        className="flex items-center gap-2 p-2 bg-surface rounded-lg"
                                    >
                                        <ArrowRight className="w-3 h-3 text-text-muted" />
                                        <span className="text-sm">
                                            {typeEmojis[dep.task_type] || '✅'}
                                        </span>
                                        <p className="text-sm text-white truncate flex-1">{dep.task_title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!hasDependencies && !showSearch && (
                        <p className="text-sm text-text-muted text-center py-4">No dependencies</p>
                    )}

                    {/* Add dependency search */}
                    {showSearch ? (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search tasks..."
                                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                                    autoFocus
                                />
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {isLoadingTasks ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                    </div>
                                ) : filteredTasks.length > 0 ? (
                                    filteredTasks.slice(0, 10).map(task => (
                                        <button
                                            key={task.id}
                                            onClick={() => addMutation.mutate(task.id)}
                                            disabled={addMutation.isPending}
                                            className="w-full flex items-center gap-2 p-2 hover:bg-surface rounded-lg text-left transition-colors"
                                        >
                                            <span className="text-sm">{typeEmojis[task.type] || '✅'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{task.title}</p>
                                                <p className="text-xs text-text-muted">{task.column_name}</p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-sm text-text-muted text-center py-2">No tasks found</p>
                                )}
                            </div>
                            <button
                                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                                className="w-full py-2 text-sm text-text-muted hover:text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowSearch(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-surface hover:bg-surface-light rounded-lg text-text-muted hover:text-white text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Blocker
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * DependencyBadge - Show blocking indicator on task cards
 */
export function DependencyBadge({ isBlocked }) {
    if (!isBlocked) return null;

    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
            <AlertTriangle className="w-3 h-3" />
            Blocked
        </span>
    );
}
