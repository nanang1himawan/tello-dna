import { useQuery } from '@tanstack/react-query';
import {
    History,
    User,
    ArrowRight,
    MessageSquare,
    Tag,
    Paperclip,
    CheckCircle,
    Edit3,
    Calendar,
    Loader2,
    Plus
} from 'lucide-react';
import { cn, getTimeAgo, getInitials } from '../lib/utils';

import { API_URL } from '../lib/api';
const API_BASE = `${API_URL}/api`;

const ACTION_CONFIG = {
    created: {
        icon: Plus,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        getText: (a) => 'created this task'
    },
    moved: {
        icon: ArrowRight,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        getText: (a) => `moved from "${a.old_value}" to "${a.new_value}"`
    },
    assigned: {
        icon: User,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        getText: (a) => {
            if (!a.old_value && a.new_value) return `assigned to ${a.new_value}`;
            if (a.old_value && !a.new_value) return `removed assignee ${a.old_value}`;
            return `changed assignee from ${a.old_value} to ${a.new_value}`;
        }
    },
    updated: {
        icon: Edit3,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        getText: (a) => {
            const field = a.field_name?.replace('_', ' ') || 'field';
            if (field === 'title') return `renamed task to "${a.new_value}"`;
            if (field === 'description') return 'updated description';
            if (field === 'due date') return `set due date to ${a.new_value}`;
            if (field === 'severity') return `changed severity to ${a.new_value}`;
            if (field === 'type') return `changed type to ${a.new_value}`;
            return `updated ${field}`;
        }
    },
    commented: {
        icon: MessageSquare,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20',
        getText: () => 'added a comment'
    },
    label_added: {
        icon: Tag,
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/20',
        getText: (a) => `added label "${a.new_value}"`
    },
    label_removed: {
        icon: Tag,
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        getText: (a) => `removed label "${a.old_value}"`
    },
    attachment_added: {
        icon: Paperclip,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        getText: (a) => `attached "${a.new_value}"`
    },
    checklist_completed: {
        icon: CheckCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        getText: (a) => `completed "${a.new_value}"`
    }
};

/**
 * ActivityLog - Display task activity history
 */
export default function ActivityLog({ taskId }) {
    const { data, isLoading } = useQuery({
        queryKey: ['task-activities', taskId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/tasks/activities.php?task_id=${taskId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            });
            return res.json();
        },
        enabled: !!taskId,
    });

    const activities = data?.data || [];

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-8 text-text-muted">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-text-muted" />
                <h3 className="text-sm font-medium text-white">Activity</h3>
                <span className="text-xs text-text-muted">({activities.length})</span>
            </div>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-6 bottom-2 w-px bg-border" />

                {/* Activity items */}
                <div className="space-y-3">
                    {activities.map((activity) => {
                        const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.updated;
                        const Icon = config.icon;

                        return (
                            <div key={activity.id} className="flex gap-3 relative">
                                {/* Icon */}
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                                    config.bgColor
                                )}>
                                    <Icon className={cn("w-4 h-4", config.color)} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-1">
                                    <p className="text-sm">
                                        <span className="font-medium text-white">
                                            {activity.user_name}
                                        </span>
                                        {' '}
                                        <span className="text-text-muted">
                                            {config.getText(activity)}
                                        </span>
                                    </p>
                                    <p className="text-xs text-text-muted mt-0.5">
                                        {getTimeAgo(activity.created_at)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
