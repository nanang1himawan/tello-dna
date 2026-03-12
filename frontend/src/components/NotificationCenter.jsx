import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Check,
    CheckCheck,
    X,
    Filter,
    Trash2,
    MessageSquare,
    UserPlus,
    AlertCircle,
    Calendar,
    Tag,
    Loader2
} from 'lucide-react';
import { notificationsApi } from '../lib/api';
import { cn, getTimeAgo } from '../lib/utils';

const NOTIFICATION_TYPES = {
    comment: { icon: MessageSquare, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
    mention: { icon: MessageSquare, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    assign: { icon: UserPlus, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
    due_soon: { icon: Calendar, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    overdue: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/20' },
    task_update: { icon: Tag, color: 'text-green-400', bgColor: 'bg-green-500/20' },
    system: { icon: Bell, color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
};

/**
 * NotificationCenter - Enhanced notification dropdown with filtering
 */
export default function NotificationCenter({ onClose }) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all'); // all, unread, read
    const [typeFilter, setTypeFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    // Fetch all notifications
    const { data: notifData, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsApi.getAll(false, 50),
        refetchInterval: 30000,
    });

    const allNotifications = notifData?.data?.data?.notifications || [];
    const unreadCount = notifData?.data?.data?.unread_count || 0;
    const readCount = allNotifications.length - unreadCount;

    // Filter by read status
    const notifications = filter === 'unread'
        ? allNotifications.filter(n => !n.is_read)
        : filter === 'read'
            ? allNotifications.filter(n => n.is_read)
            : allNotifications;

    // Filter by type
    const filteredNotifications = typeFilter === 'all'
        ? notifications
        : notifications.filter(n => n.type === typeFilter);

    // Group by date
    const grouped = groupNotificationsByDate(filteredNotifications);

    // Mutations
    const markAllReadMutation = useMutation({
        mutationFn: () => notificationsApi.markAllAsRead(),
        onSuccess: () => queryClient.invalidateQueries(['notifications']),
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id) => notificationsApi.markAsRead(id),
        onSuccess: () => queryClient.invalidateQueries(['notifications']),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => notificationsApi.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['notifications']),
    });

    const handleClick = (notif) => {
        if (!notif.is_read) {
            markAsReadMutation.mutate(notif.id);
        }
        // Navigate based on notification data
        if (notif.data?.task_id) {
            navigate(`/projects/${notif.data.project_id || ''}`);
        }
        onClose?.();
    };

    return (
        <div className="w-96 glass rounded-xl shadow-2xl border border-border animate-fadeIn overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs font-medium">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "p-1.5 rounded hover:bg-surface transition-colors",
                                showFilters && "bg-surface text-primary"
                            )}
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                        {onClose && (
                            <button onClick={onClose} className="p-1.5 hover:bg-surface rounded">
                                <X className="w-4 h-4 text-text-muted" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm transition-colors",
                            filter === 'all'
                                ? "bg-primary/20 text-primary"
                                : "text-text-muted hover:bg-surface"
                        )}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5",
                            filter === 'unread'
                                ? "bg-primary/20 text-primary"
                                : "text-text-muted hover:bg-surface"
                        )}
                    >
                        Unread
                        {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[10px] font-medium leading-none">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setFilter('read')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5",
                            filter === 'read'
                                ? "bg-primary/20 text-primary"
                                : "text-text-muted hover:bg-surface"
                        )}
                    >
                        Read
                        {readCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium leading-none">
                                {readCount}
                            </span>
                        )}
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllReadMutation.mutate()}
                            disabled={markAllReadMutation.isPending}
                            className="ml-auto px-3 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1"
                        >
                            <CheckCheck className="w-3 h-3" />
                            Mark all read
                        </button>
                    )}
                </div>

                {/* Type Filter */}
                {showFilters && (
                    <div className="mt-3 flex flex-wrap gap-1">
                        {['all', 'comment', 'assign', 'due_soon', 'overdue'].map(type => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={cn(
                                    "px-2 py-1 rounded text-xs capitalize transition-colors",
                                    typeFilter === type
                                        ? "bg-surface text-white"
                                        : "text-text-muted hover:text-white"
                                )}
                            >
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-12">
                        <Bell className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-50" />
                        <p className="text-text-muted text-sm">No notifications</p>
                        <p className="text-text-muted text-xs mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([date, items]) => (
                        <div key={date}>
                            <div className="px-4 py-2 bg-surface/50 sticky top-0">
                                <p className="text-xs text-text-muted font-medium">{date}</p>
                            </div>
                            {items.map((notif) => {
                                const config = NOTIFICATION_TYPES[notif.type] || NOTIFICATION_TYPES.system;
                                const Icon = config.icon;

                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleClick(notif)}
                                        className={cn(
                                            "flex gap-3 p-4 border-b border-border hover:bg-surface/50 cursor-pointer transition-colors group",
                                            !notif.is_read && "bg-primary/5"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                                            config.bgColor
                                        )}>
                                            <Icon className={cn("w-4 h-4", config.color)} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-white">
                                                {notif.title}
                                            </p>
                                            <p className="text-[11px] text-text-muted line-clamp-2 mt-0.5 leading-relaxed">
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {notif.data?.project_name && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 rounded text-[10px] font-medium">
                                                        {notif.data.project_name}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-text-muted">
                                                    {getTimeAgo(notif.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notif.is_read && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsReadMutation.mutate(notif.id);
                                                    }}
                                                    className="p-1 hover:bg-surface rounded"
                                                    title="Mark as read"
                                                >
                                                    <Check className="w-3 h-3 text-green-400" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteMutation.mutate(notif.id);
                                                }}
                                                className="p-1 hover:bg-red-500/20 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>

                                        {/* Unread indicator */}
                                        {!notif.is_read && (
                                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * Group notifications by date
 */
function groupNotificationsByDate(notifications) {
    const groups = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    notifications.forEach(notif => {
        const date = new Date(notif.created_at).toDateString();
        let label;

        if (date === today) label = 'Today';
        else if (date === yesterday) label = 'Yesterday';
        else label = new Date(notif.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        if (!groups[label]) groups[label] = [];
        groups[label].push(notif);
    });

    return groups;
}

/**
 * NotificationBell - Use in header as trigger
 */
export function NotificationBell({ onClick, unreadCount }) {
    return (
        <button
            onClick={onClick}
            className="relative p-2 rounded-xl hover:bg-surface transition-colors group"
        >
            <Bell className="w-5 h-5 text-text-muted group-hover:text-white transition-colors" />
            {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full px-1 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
}
