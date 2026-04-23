import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    X,
    Loader2,
    FileText,
    FolderOpen,
    User
} from 'lucide-react';
import { cn, getInitials } from '../lib/utils';

import { API_URL } from '../lib/api';
const API_BASE = `${API_URL}/api`;

const typeConfig = {
    epic: { emoji: '⚡', color: 'text-purple-400' },
    story: { emoji: '📖', color: 'text-green-400' },
    task: { emoji: '✅', color: 'text-blue-400' },
    bug: { emoji: '🐛', color: 'text-red-400' },
};

export default function GlobalSearch({ className }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Keyboard shortcut (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Search query
    const { data: searchData, isLoading } = useQuery({
        queryKey: ['search', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery.trim()) return { tasks: [], projects: [] };
            const res = await fetch(`${API_BASE}/search.php?q=${encodeURIComponent(debouncedQuery)}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            });
            return res.json();
        },
        enabled: debouncedQuery.length >= 2,
    });

    const results = searchData?.data || { tasks: [], projects: [] };
    const hasResults = results.tasks?.length > 0 || results.projects?.length > 0;

    const handleSelect = (type, item) => {
        setIsOpen(false);
        setQuery('');
        if (type === 'task') {
            navigate(`/projects/${item.project_id}`);
        } else if (type === 'project') {
            navigate(`/projects/${item.id}`);
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 bg-surface rounded-lg text-text-muted hover:text-white transition-colors w-full",
                    className
                )}
            >
                <Search className="w-4 h-4" />
                <span className="text-sm flex-1 text-left">Search...</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-background rounded border border-border">
                    ⌘K
                </kbd>
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setIsOpen(false)}>
                    <div className="absolute inset-0 bg-black/60" />
                    <div
                        className="relative w-full max-w-xl bg-surface rounded-2xl shadow-2xl animate-fadeIn"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-3 p-4 border-b border-border">
                            <Search className="w-5 h-5 text-text-muted" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search tasks, projects..."
                                className="flex-1 bg-transparent text-white placeholder:text-text-muted focus:outline-none"
                            />
                            {isLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-surface-light rounded">
                                <X className="w-4 h-4 text-text-muted" />
                            </button>
                        </div>

                        {/* Results */}
                        <div className="max-h-96 overflow-y-auto">
                            {debouncedQuery.length < 2 ? (
                                <div className="p-8 text-center text-text-muted">
                                    <p>Type at least 2 characters to search</p>
                                </div>
                            ) : !hasResults && !isLoading ? (
                                <div className="p-8 text-center text-text-muted">
                                    <p>No results found for "{debouncedQuery}"</p>
                                </div>
                            ) : (
                                <div className="p-2">
                                    {/* Tasks */}
                                    {results.tasks?.length > 0 && (
                                        <div className="mb-4">
                                            <div className="px-3 py-2 text-xs font-medium text-text-muted uppercase">
                                                Tasks
                                            </div>
                                            {results.tasks.map((task) => {
                                                const type = typeConfig[task.type] || typeConfig.task;
                                                return (
                                                    <button
                                                        key={task.id}
                                                        onClick={() => handleSelect('task', task)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-light transition-colors text-left"
                                                    >
                                                        <span className={cn("text-lg", type.color)}>{type.emoji}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-sm truncate">{task.title}</p>
                                                            <p className="text-text-muted text-xs truncate">{task.project_name}</p>
                                                        </div>
                                                        {task.assignee_name && (
                                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                                                                {getInitials(task.assignee_name)}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Projects */}
                                    {results.projects?.length > 0 && (
                                        <div>
                                            <div className="px-3 py-2 text-xs font-medium text-text-muted uppercase">
                                                Projects
                                            </div>
                                            {results.projects.map((project) => (
                                                <button
                                                    key={project.id}
                                                    onClick={() => handleSelect('project', project)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-light transition-colors text-left"
                                                >
                                                    <FolderOpen className="w-5 h-5 text-primary" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-sm truncate">{project.name}</p>
                                                        <p className="text-text-muted text-xs truncate">{project.key}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-border text-xs text-text-muted flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">↵</kbd> to select
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">esc</kbd> to close
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
