import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { tasksApi, projectsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    ArrowLeft,
    Plus,
    Loader2,
    Calendar,
    Play,
    CheckCircle2,
    MoreHorizontal,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    X
} from 'lucide-react';
import { cn, formatDate, getInitials } from '../lib/utils';

import { API_URL } from '../lib/api';
const API_BASE = `${API_URL}/api`;

const typeConfig = {
    epic: { emoji: '⚡', color: 'bg-purple-500/20 text-purple-400' },
    story: { emoji: '📖', color: 'bg-green-500/20 text-green-400' },
    task: { emoji: '✅', color: 'bg-blue-500/20 text-blue-400' },
    bug: { emoji: '🐛', color: 'bg-red-500/20 text-red-400' },
};

export default function Backlog() {
    const { projectId } = useParams();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showSprintModal, setShowSprintModal] = useState(false);
    const [expandedSprints, setExpandedSprints] = useState({});

    const canManage = user?.role === 'admin' || user?.role === 'manager';

    // Fetch project
    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => fetch(`${API_BASE}/projects/show.php?id=${projectId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }).then(res => res.json()),
    });
    const project = projectData?.data;

    // Fetch sprints
    const { data: sprintsData, isLoading: loadingSprints } = useQuery({
        queryKey: ['sprints', projectId],
        queryFn: () => fetch(`${API_BASE}/sprints/index.php?project_id=${projectId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }).then(res => res.json()),
    });
    const sprints = sprintsData?.data || [];

    // Fetch backlog tasks (no sprint assigned)
    const { data: backlogData, isLoading: loadingBacklog } = useQuery({
        queryKey: ['backlog', projectId],
        queryFn: () => fetch(`${API_BASE}/tasks/backlog.php?project_id=${projectId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }).then(res => res.json()),
    });
    const backlogTasks = backlogData?.data || [];

    // Assign task to sprint
    const assignToSprintMutation = useMutation({
        mutationFn: ({ taskId, sprintId }) => tasksApi.update(taskId, { sprint_id: sprintId }),
        onSuccess: () => {
            queryClient.invalidateQueries(['backlog', projectId]);
            queryClient.invalidateQueries(['sprints', projectId]);
        },
    });

    // Start sprint
    const startSprintMutation = useMutation({
        mutationFn: (sprintId) => fetch(`${API_BASE}/sprints/update.php?id=${sprintId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'active' })
        }),
        onSuccess: () => queryClient.invalidateQueries(['sprints', projectId]),
    });

    // Complete sprint
    const completeSprintMutation = useMutation({
        mutationFn: (sprintId) => fetch(`${API_BASE}/sprints/update.php?id=${sprintId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'completed' })
        }),
        onSuccess: () => queryClient.invalidateQueries(['sprints', projectId]),
    });

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const { draggableId, destination } = result;
        const taskId = draggableId.replace('task-', '');
        const sprintId = destination.droppableId === 'backlog' ? null : destination.droppableId.replace('sprint-', '');
        assignToSprintMutation.mutate({ taskId, sprintId });
    };

    const toggleSprint = (sprintId) => {
        setExpandedSprints(prev => ({ ...prev, [sprintId]: !prev[sprintId] }));
    };

    if (loadingSprints || loadingBacklog) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    const activeSprint = sprints.find(s => s.status === 'active');
    const planningSprints = sprints.filter(s => s.status === 'planning');
    const completedSprints = sprints.filter(s => s.status === 'completed');

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/projects" className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white">{project?.name} - Backlog</h1>
                        <p className="text-sm text-text-muted">Kelola sprint dan backlog</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
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
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white"
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
                            className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-surface-light transition-colors"
                        >
                            📋 Table
                        </Link>
                    </div>

                    {canManage && (
                        <button
                            onClick={() => setShowSprintModal(true)}
                            className="px-4 py-2 gradient-primary text-white rounded-xl btn-hover flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Buat Sprint
                        </button>
                    )}
                </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-4">
                    {/* Active Sprint */}
                    {activeSprint && (
                        <SprintSection
                            sprint={activeSprint}
                            expanded={expandedSprints[activeSprint.id] !== false}
                            onToggle={() => toggleSprint(activeSprint.id)}
                            onComplete={() => canManage && completeSprintMutation.mutate(activeSprint.id)}
                            canManage={canManage}
                            isActive
                        />
                    )}

                    {/* Planning Sprints */}
                    {planningSprints.map(sprint => (
                        <SprintSection
                            key={sprint.id}
                            sprint={sprint}
                            expanded={expandedSprints[sprint.id] !== false}
                            onToggle={() => toggleSprint(sprint.id)}
                            onStart={() => canManage && startSprintMutation.mutate(sprint.id)}
                            canManage={canManage}
                        />
                    ))}

                    {/* Backlog */}
                    <div className="glass rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h2 className="font-semibold text-white">📋 Backlog</h2>
                                <span className="text-sm text-text-muted">({backlogTasks.length} issues)</span>
                            </div>
                        </div>
                        <Droppable droppableId="backlog">
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={cn(
                                        "min-h-[100px] p-4 space-y-2 transition-colors",
                                        snapshot.isDraggingOver && "bg-primary/5"
                                    )}
                                >
                                    {backlogTasks.length === 0 ? (
                                        <p className="text-center text-text-muted py-8">Backlog kosong</p>
                                    ) : (
                                        backlogTasks.map((task, index) => (
                                            <TaskItem key={task.id} task={task} index={index} />
                                        ))
                                    )}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>

                    {/* Completed Sprints (collapsed) */}
                    {completedSprints.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-text-muted">Sprint Selesai ({completedSprints.length})</h3>
                            {completedSprints.slice(0, 3).map(sprint => (
                                <div key={sprint.id} className="glass rounded-xl p-4 opacity-60">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        <span className="font-medium text-white">{sprint.name}</span>
                                        <span className="text-sm text-text-muted">
                                            {sprint.task_count} tasks • {sprint.completed_count} done
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DragDropContext>

            {/* Sprint Modal */}
            {showSprintModal && (
                <SprintModal
                    projectId={projectId}
                    onClose={() => setShowSprintModal(false)}
                />
            )}
        </div>
    );
}

function SprintSection({ sprint, expanded, onToggle, onStart, onComplete, canManage, isActive }) {
    return (
        <div className={cn(
            "glass rounded-xl overflow-hidden",
            isActive && "ring-2 ring-primary/50"
        )}>
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onToggle} className="text-text-muted hover:text-white">
                        {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-semibold text-white">{sprint.name}</h2>
                            {isActive && (
                                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium">
                                    Aktif
                                </span>
                            )}
                            {sprint.status === 'planning' && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                                    Planning
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-text-muted">
                            <span>{sprint.task_count || 0} issues</span>
                            {sprint.start_date && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canManage && sprint.status === 'planning' && onStart && (
                        <button
                            onClick={onStart}
                            className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 flex items-center gap-1"
                        >
                            <Play className="w-3 h-3" />
                            Start Sprint
                        </button>
                    )}
                    {canManage && isActive && onComplete && (
                        <button
                            onClick={onComplete}
                            className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 flex items-center gap-1"
                        >
                            <CheckCircle2 className="w-3 h-3" />
                            Complete
                        </button>
                    )}
                </div>
            </div>
            {expanded && (
                <Droppable droppableId={`sprint-${sprint.id}`}>
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                                "min-h-[80px] p-4 space-y-2 transition-colors",
                                snapshot.isDraggingOver && "bg-primary/5"
                            )}
                        >
                            {(!sprint.tasks || sprint.tasks.length === 0) ? (
                                <p className="text-center text-text-muted py-4">Drag issues dari backlog ke sini</p>
                            ) : (
                                sprint.tasks?.map((task, index) => (
                                    <TaskItem key={task.id} task={task} index={index} />
                                ))
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            )}
        </div>
    );
}

function TaskItem({ task, index }) {
    const type = typeConfig[task.type] || typeConfig.task;

    return (
        <Draggable draggableId={`task-${task.id}`} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                        "bg-surface/50 rounded-lg p-3 flex items-center gap-3 transition-all",
                        snapshot.isDragging && "shadow-xl ring-2 ring-primary"
                    )}
                >
                    <span className={cn("text-xs px-2 py-0.5 rounded font-medium", type.color)}>
                        {type.emoji} {task.type || 'task'}
                    </span>
                    <span className="flex-1 text-white font-medium truncate">{task.title}</span>
                    {task.severity !== 'minor' && (
                        <span className={cn(
                            "text-xs px-2 py-0.5 rounded",
                            task.severity === 'critical' ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                        )}>
                            {task.severity}
                        </span>
                    )}
                    {task.assignee_name && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium" title={task.assignee_name}>
                            {getInitials(task.assignee_name)}
                        </div>
                    )}
                </div>
            )}
        </Draggable>
    );
}

function SprintModal({ projectId, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        goal: '',
        start_date: '',
        end_date: '',
    });

    const createMutation = useMutation({
        mutationFn: () => fetch(`${API_BASE}/sprints/create.php`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...formData, project_id: projectId })
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['sprints', projectId]);
            onClose();
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        createMutation.mutate();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl w-full max-w-md animate-fadeIn">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-bold text-white">Buat Sprint Baru</h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg">
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Nama Sprint</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Sprint 1"
                            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Goal (optional)</label>
                        <textarea
                            value={formData.goal}
                            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                            placeholder="Tujuan sprint ini..."
                            rows={2}
                            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">Start Date</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">End Date</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-surface border border-border text-white rounded-xl hover:bg-surface-light"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="flex-1 px-4 py-2 gradient-primary text-white rounded-xl btn-hover disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Buat Sprint
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
