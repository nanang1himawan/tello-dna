import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    FolderKanban,
    Calendar,
    Users,
    Settings,
    LogOut,
    Building2,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    BarChart3,
    List,
    PieChart
} from 'lucide-react';
import { cn, getInitials, getRoleBadgeColor } from '../../lib/utils';
import { useState } from 'react';
import GlobalSearch from '../GlobalSearch';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'manager'] },
    { icon: FolderKanban, label: 'Projects', path: '/projects' },
    { icon: List, label: 'All Issues', path: '/issues' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: PieChart, label: 'Reports', path: '/reports' },
    { icon: BarChart3, label: 'Workload', path: '/workload', roles: ['admin', 'manager'] },
    { icon: Users, label: 'Users', path: '/users', roles: ['admin', 'manager'] },
    { icon: Briefcase, label: 'Bidang', path: '/departments', roles: ['admin'] },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    const filteredMenuItems = menuItems.filter(
        (item) => !item.roles || item.roles.includes(user?.role)
    );

    return (
        <aside className={cn(
            "h-screen glass border-r border-border flex flex-col transition-all duration-300 sticky top-0",
            collapsed ? "w-20" : "w-64"
        )}>
            {/* Logo */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="animate-fadeIn">
                            <h1 className="font-bold text-white text-lg">Office App</h1>
                            <p className="text-xs text-text-muted">Project Management</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Search */}
            {!collapsed && (
                <div className="px-4 py-2">
                    <GlobalSearch />
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {filteredMenuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                            isActive
                                ? "bg-primary/20 text-primary"
                                : "text-text-muted hover:bg-surface hover:text-white",
                            collapsed && "justify-center px-3"
                        )}
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && (
                            <span className="font-medium animate-fadeIn">{item.label}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted hover:text-white hover:bg-primary transition-all"
            >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* User Profile & Logout */}
            <div className="p-4 border-t border-border">
                <div className={cn(
                    "flex items-center gap-3 mb-3",
                    collapsed && "justify-center"
                )}>
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                        {getInitials(user?.name)}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0 animate-fadeIn">
                            <div className="font-medium text-white text-sm truncate">{user?.name}</div>
                            <div className={cn(
                                "text-xs px-2 py-0.5 rounded-full inline-block border capitalize",
                                getRoleBadgeColor(user?.role)
                            )}>
                                {user?.role}
                            </div>
                        </div>
                    )}
                </div>
                <button
                    onClick={logout}
                    className={cn(
                        "flex items-center gap-3 w-full px-4 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors",
                        collapsed && "justify-center px-3"
                    )}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="font-medium">Logout</span>}
                </button>
            </div>
        </aside>
    );
}
