import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, taskMembersApi, watchersApi } from '../lib/api';
import { X, Plus, Search, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn, getInitials } from '../lib/utils';

/**
 * MembersDropdown - Manage multiple task members
 * @param {Object} props
 * @param {string} props.taskId - Task ID
 * @param {Array} props.initialMembers - Initial members array
 * @param {boolean} props.canEdit - Whether user can edit
 * @param {Function} props.onMembersChange - Callback when members change
 */
export function MembersDropdown({ taskId, initialMembers = [], canEdit = true, onMembersChange }) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Fetch all users (using basic list that works for all users)
    const { data: usersData } = useQuery({
        queryKey: ['users-basic'],
        queryFn: () => usersApi.getBasicList(),
    });
    const users = usersData?.data?.data?.users || [];

    // Fetch task members
    const { data: membersData, refetch: refetchMembers } = useQuery({
        queryKey: ['task-members', taskId],
        queryFn: () => taskMembersApi.getByTask(taskId),
        enabled: !!taskId,
    });
    const members = membersData?.data?.data || initialMembers;

    // Add member mutation
    const addMemberMutation = useMutation({
        mutationFn: (userId) => taskMembersApi.add(taskId, userId),
        onSuccess: () => {
            refetchMembers();
            queryClient.invalidateQueries(['board']);
            onMembersChange?.();
        },
    });

    // Remove member mutation
    const removeMemberMutation = useMutation({
        mutationFn: (userId) => taskMembersApi.remove(taskId, userId),
        onSuccess: () => {
            refetchMembers();
            queryClient.invalidateQueries(['board']);
            onMembersChange?.();
        },
    });

    const memberIds = members.map(m => m.id);
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const toggleMember = (userId) => {
        if (memberIds.includes(userId)) {
            removeMemberMutation.mutate(userId);
        } else {
            addMemberMutation.mutate(userId);
        }
    };

    return (
        <div className="relative">
            {/* Members Display */}
            <div className="flex flex-wrap items-center gap-2">
                {members.length > 0 ? (
                    <>
                        {members.slice(0, 5).map((member) => (
                            <div
                                key={member.id}
                                className="group relative flex items-center gap-2 px-2 py-1 bg-surface rounded-lg"
                                title={member.name}
                            >
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                                    {getInitials(member.name)}
                                </div>
                                <span className="text-xs text-white">{member.name.split(' ')[0]}</span>
                                {canEdit && (
                                    <button
                                        onClick={() => removeMemberMutation.mutate(member.id)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-surface-light rounded text-text-muted hover:text-red-400 transition-all"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {members.length > 5 && (
                            <span className="text-xs text-text-muted">+{members.length - 5} more</span>
                        )}
                    </>
                ) : (
                    <span className="text-sm text-text-muted">No members assigned</span>
                )}

                {canEdit && (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1.5 hover:bg-surface rounded-lg text-text-muted hover:text-primary transition-colors"
                        title="Add members"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Menu */}
                    <div className="absolute top-full left-0 mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                        {/* Search */}
                        <div className="p-3 border-b border-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search members..."
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Users List */}
                        <div className="max-h-64 overflow-y-auto">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => {
                                    const isMember = memberIds.includes(user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => toggleMember(user.id)}
                                            disabled={addMemberMutation.isPending || removeMemberMutation.isPending}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                                                {getInitials(user.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{user.name}</p>
                                                <p className="text-xs text-text-muted truncate">{user.email}</p>
                                            </div>
                                            {isMember && (
                                                <Check className="w-4 h-4 text-primary" />
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="px-4 py-6 text-center text-sm text-text-muted">No users found</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * WatchButton - Toggle watch/unwatch for a task
 */
export function WatchButton({ taskId, className }) {
    const queryClient = useQueryClient();

    // Fetch watch status
    const { data: watchData } = useQuery({
        queryKey: ['task-watchers', taskId],
        queryFn: () => watchersApi.getByTask(taskId),
        enabled: !!taskId,
    });
    const isWatching = watchData?.data?.data?.is_watching || false;
    const watcherCount = watchData?.data?.data?.count || 0;

    // Toggle mutation
    const toggleMutation = useMutation({
        mutationFn: () => watchersApi.toggle(taskId),
        onSuccess: () => {
            queryClient.invalidateQueries(['task-watchers', taskId]);
        },
    });

    return (
        <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                isWatching
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-surface text-text-muted hover:text-white",
                className
            )}
        >
            {toggleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : isWatching ? (
                <Eye className="w-4 h-4" />
            ) : (
                <EyeOff className="w-4 h-4" />
            )}
            <span>{isWatching ? 'Watching' : 'Watch'}</span>
            {watcherCount > 0 && (
                <span className="text-xs bg-surface px-1.5 py-0.5 rounded">{watcherCount}</span>
            )}
        </button>
    );
}

export default MembersDropdown;
