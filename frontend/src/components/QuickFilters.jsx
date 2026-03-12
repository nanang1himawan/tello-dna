import { useState } from 'react';
import {
    Filter,
    X,
    User,
    Tag,
    Calendar,
    ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * QuickFilters - Filter tasks on board by various criteria
 */
export default function QuickFilters({
    users,
    filters,
    onFilterChange,
    className
}) {
    const [showFilters, setShowFilters] = useState(false);

    // Ensure users is always an array
    const usersList = Array.isArray(users) ? users : [];

    const hasActiveFilters = filters?.type || filters?.assignee || filters?.dueDate;

    const clearFilters = () => {
        onFilterChange({ type: '', assignee: '', dueDate: '' });
    };

    const types = [
        { value: 'epic', label: '⚡ Epic', color: 'text-purple-400' },
        { value: 'story', label: '📖 Story', color: 'text-green-400' },
        { value: 'task', label: '✅ Task', color: 'text-blue-400' },
        { value: 'bug', label: '🐛 Bug', color: 'text-red-400' },
    ];

    const dueDateOptions = [
        { value: 'overdue', label: 'Overdue' },
        { value: 'today', label: 'Due Today' },
        { value: 'week', label: 'Due This Week' },
        { value: 'none', label: 'No Due Date' },
    ];

    return (
        <div className={cn("relative", className)}>
            <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    hasActiveFilters
                        ? "bg-primary text-white"
                        : "bg-surface text-text-muted hover:text-white"
                )}
            >
                <Filter className="w-4 h-4" />
                Filter
                {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                )}
                <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
            </button>

            {showFilters && (
                <div className="absolute top-full right-0 mt-2 w-72 glass rounded-xl p-4 space-y-4 z-50 animate-fadeIn">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">Filters</span>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="text-xs text-primary hover:underline"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Type Filter */}
                    <div>
                        <label className="text-xs text-text-muted mb-2 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Type
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {types.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => onFilterChange({
                                        ...filters,
                                        type: filters?.type === type.value ? '' : type.value
                                    })}
                                    className={cn(
                                        "px-2 py-1 rounded-lg text-xs transition-colors",
                                        filters?.type === type.value
                                            ? "bg-primary text-white"
                                            : "bg-surface text-text-muted hover:text-white"
                                    )}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Assignee Filter */}
                    <div>
                        <label className="text-xs text-text-muted mb-2 flex items-center gap-1">
                            <User className="w-3 h-3" /> Assignee
                        </label>
                        <select
                            value={filters?.assignee || ''}
                            onChange={(e) => onFilterChange({ ...filters, assignee: e.target.value })}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                        >
                            <option value="">All Members</option>
                            <option value="unassigned">Unassigned</option>
                            {usersList.map((user) => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Due Date Filter */}
                    <div>
                        <label className="text-xs text-text-muted mb-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Due Date
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {dueDateOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => onFilterChange({
                                        ...filters,
                                        dueDate: filters?.dueDate === opt.value ? '' : opt.value
                                    })}
                                    className={cn(
                                        "px-2 py-1 rounded-lg text-xs transition-colors",
                                        filters?.dueDate === opt.value
                                            ? "bg-primary text-white"
                                            : "bg-surface text-text-muted hover:text-white"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Close button for mobile */}
                    <button
                        onClick={() => setShowFilters(false)}
                        className="w-full py-2 text-center text-sm text-text-muted hover:text-white border-t border-border pt-3"
                    >
                        Close
                    </button>
                </div>
            )}

            {/* Backdrop */}
            {showFilters && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFilters(false)}
                />
            )}
        </div>
    );
}

/**
 * Filter tasks based on filter criteria
 */
export function filterTasks(tasks, filters) {
    if (!filters || (!filters.type && !filters.assignee && !filters.dueDate)) {
        return tasks;
    }

    return tasks.filter(task => {
        // Type filter
        if (filters.type && task.type !== filters.type) {
            return false;
        }

        // Assignee filter
        if (filters.assignee === 'unassigned' && task.assignee_id) {
            return false;
        }
        if (filters.assignee && filters.assignee !== 'unassigned' && task.assignee_id != filters.assignee) {
            return false;
        }

        // Due date filter
        if (filters.dueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const taskDueDate = task.due_date ? new Date(task.due_date) : null;
            if (taskDueDate) taskDueDate.setHours(0, 0, 0, 0);

            switch (filters.dueDate) {
                case 'overdue':
                    if (!taskDueDate || taskDueDate >= today) return false;
                    break;
                case 'today':
                    if (!taskDueDate || taskDueDate.getTime() !== today.getTime()) return false;
                    break;
                case 'week':
                    const weekEnd = new Date(today);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    if (!taskDueDate || taskDueDate > weekEnd || taskDueDate < today) return false;
                    break;
                case 'none':
                    if (taskDueDate) return false;
                    break;
            }
        }

        return true;
    });
}
