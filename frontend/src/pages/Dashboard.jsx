import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi, notificationsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    FolderKanban,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Users,
    TrendingUp,
    Bell,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { cn, formatDateTime, getSeverityColor } from '../lib/utils';

export default function Dashboard() {
    const { user } = useAuth();

    // Fetch dashboard stats
    const { data: statsData, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => dashboardApi.getStats(),
    });

    const stats = statsData?.data?.data || {};

    // Fetch notifications
    const { data: notifData } = useQuery({
        queryKey: ['notifications', 'unread'],
        queryFn: () => notificationsApi.getAll(true, 5),
    });

    const notifications = notifData?.data?.data?.notifications || [];
    const unreadCount = notifData?.data?.data?.unread_count || 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-primary" />
                        Dashboard
                    </h1>
                    <p className="text-text-muted">
                        Selamat datang kembali, <span className="text-white font-medium">{user?.name}</span>!
                    </p>
                </div>
                <div className="text-sm text-text-muted">
                    {new Date().toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={FolderKanban}
                    label="Total Projects"
                    value={stats.total_projects || 0}
                    color="primary"
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Open Tasks"
                    value={stats.my_open_tasks || 0}
                    color="blue"
                />
                <StatCard
                    icon={AlertTriangle}
                    label="Overdue"
                    value={stats.overdue_tasks || 0}
                    color="red"
                    alert={stats.overdue_tasks > 0}
                />
                <StatCard
                    icon={Clock}
                    label="Due This Week"
                    value={stats.due_this_week || 0}
                    color="amber"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tasks by Severity */}
                <div className="glass rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Tasks by Priority
                    </h3>
                    <div className="space-y-3">
                        {['critical', 'major', 'minor'].map((severity) => {
                            const count = stats.tasks_by_severity?.find(t => t.severity === severity)?.count || 0;
                            const total = stats.my_open_tasks || 1;
                            const percentage = Math.round((count / total) * 100) || 0;

                            return (
                                <div key={severity} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className={cn(
                                            "capitalize font-medium px-2 py-0.5 rounded border",
                                            getSeverityColor(severity)
                                        )}>
                                            {severity}
                                        </span>
                                        <span className="text-text-muted">{count} tasks</span>
                                    </div>
                                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                severity === 'critical' ? 'bg-red-500' :
                                                    severity === 'major' ? 'bg-amber-500' : 'bg-blue-500'
                                            )}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Notifications */}
                <div className="glass rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Bell className="w-5 h-5 text-primary" />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </h3>
                    </div>

                    {notifications.length === 0 ? (
                        <p className="text-text-muted text-sm text-center py-8">
                            Tidak ada notifikasi baru
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {notifications.slice(0, 5).map((notif) => (
                                <div
                                    key={notif.id}
                                    className="p-3 bg-surface/50 rounded-lg border-l-2 border-primary"
                                >
                                    <p className="text-sm text-white">{notif.message}</p>
                                    <p className="text-xs text-text-muted mt-1">
                                        {formatDateTime(notif.created_at)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tasks by Status */}
                <div className="glass rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        Tasks by Status
                    </h3>

                    {stats.tasks_by_status?.length === 0 ? (
                        <p className="text-text-muted text-sm text-center py-8">
                            Belum ada task
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {stats.tasks_by_status?.map((status, index) => (
                                <div
                                    key={`${status.column_name}-${index}`}
                                    className="flex items-center justify-between p-2 bg-surface/50 rounded-lg"
                                >
                                    <span className="text-sm text-white">{status.column_name}</span>
                                    <span className="text-sm font-medium text-primary">{status.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link
                        to="/projects"
                        className="p-4 bg-surface hover:bg-surface-light rounded-xl transition-colors group flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <FolderKanban className="w-5 h-5 text-primary" />
                            <span className="text-white">View Projects</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                    </Link>
                    <Link
                        to="/calendar"
                        className="p-4 bg-surface hover:bg-surface-light rounded-xl transition-colors group flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-primary" />
                            <span className="text-white">View Calendar</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                    </Link>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                        <Link
                            to="/users"
                            className="p-4 bg-surface hover:bg-surface-light rounded-xl transition-colors group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-primary" />
                                <span className="text-white">Manage Users</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, alert }) {
    const colorClasses = {
        primary: 'bg-primary/20 text-primary',
        blue: 'bg-blue-500/20 text-blue-400',
        red: 'bg-red-500/20 text-red-400',
        amber: 'bg-amber-500/20 text-amber-400',
        green: 'bg-green-500/20 text-green-400',
    };

    return (
        <div className={cn(
            "glass rounded-xl p-5 card-hover",
            alert && "border-red-500/50"
        )}>
            <div className="flex items-center justify-between mb-3">
                <div className={cn("p-2 rounded-lg", colorClasses[color])}>
                    <Icon className="w-5 h-5" />
                </div>
                {alert && (
                    <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                        Attention
                    </span>
                )}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm text-text-muted">{label}</div>
        </div>
    );
}
