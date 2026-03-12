import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Search, Menu, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../lib/api';
import { getInitials, formatDateTime, cn } from '../../lib/utils';
import NotificationCenter from '../NotificationCenter';

const pageTitle = {
    '/dashboard': 'Dashboard',
    '/projects': 'Projects',
    '/calendar': 'Calendar',
    '/users': 'User Management',
    '/departments': 'Departments',
    '/settings': 'Settings',
};

export default function Header() {
    const location = useLocation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showNotifications, setShowNotifications] = useState(false);

    const title = pageTitle[location.pathname] || 'Office App';

    // Fetch notifications count
    const { data: notifData } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsApi.getAll(false, 10),
        refetchInterval: 30000,
    });

    const unreadCount = notifData?.data?.data?.unread_count || 0;

    return (
        <header className="glass border-b border-border px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
                {/* Page Title */}
                <div>
                    <h1 className="text-xl font-bold text-white">{title}</h1>
                    <p className="text-sm text-text-muted">
                        {new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Cari project, task..."
                            className="w-64 pl-10 pr-4 py-2 bg-surface border border-border rounded-xl text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 rounded-xl hover:bg-surface transition-colors group"
                        >
                            <Bell className="w-5 h-5 text-text-muted group-hover:text-white transition-colors" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full px-1 animate-pulse">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Center Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 top-12 z-50">
                                <NotificationCenter onClose={() => setShowNotifications(false)} />
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu */}
                    <button className="p-2 rounded-xl hover:bg-surface transition-colors md:hidden">
                        <Menu className="w-5 h-5 text-text-muted" />
                    </button>

                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity">
                        {getInitials(user?.name)}
                    </div>
                </div>
            </div>
        </header>
    );
}

