import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Tag,
    Plus,
    X,
    Check,
    Loader2,
    Edit2,
    Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/project-gemini/project-03/backend'}/api`;

const PRESET_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#a855f7', // purple
    '#ec4899', // pink
    '#6b7280', // gray
];

/**
 * LabelsManager - Component to manage and assign labels
 */
export default function LabelsManager({ boardId, taskId, taskLabels = [], onClose }) {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [newLabel, setNewLabel] = useState({ name: '', color: PRESET_COLORS[0] });
    const [editingLabel, setEditingLabel] = useState(null);

    // Fetch all labels for board
    const { data: labelsData, isLoading } = useQuery({
        queryKey: ['labels', boardId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/labels/index.php?board_id=${boardId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            });
            return res.json();
        },
        enabled: !!boardId,
    });
    const allLabels = labelsData?.data || [];

    // Create label mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`${API_BASE}/labels/index.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...data, board_id: boardId })
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['labels', boardId]);
            setNewLabel({ name: '', color: PRESET_COLORS[0] });
            setShowCreate(false);
        },
    });

    // Update label mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, ...data }) => {
            const res = await fetch(`${API_BASE}/labels/index.php?id=${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['labels', boardId]);
            setEditingLabel(null);
        },
    });

    // Delete label mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await fetch(`${API_BASE}/labels/index.php?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['labels', boardId]);
            queryClient.invalidateQueries(['task-labels', taskId]);
        },
    });

    // Toggle label on task
    const toggleMutation = useMutation({
        mutationFn: async ({ labelId, isAdding }) => {
            const url = isAdding
                ? `${API_BASE}/labels/task.php`
                : `${API_BASE}/labels/task.php?task_id=${taskId}&label_id=${labelId}`;

            const res = await fetch(url, {
                method: isAdding ? 'POST' : 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: isAdding ? JSON.stringify({ task_id: taskId, label_id: labelId }) : undefined
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['task-labels', taskId]);
            queryClient.invalidateQueries(['board']);
        },
    });

    const isLabelAssigned = (labelId) => {
        return taskLabels.some(l => l.id === labelId);
    };

    const handleToggle = (label) => {
        const isAdding = !isLabelAssigned(label.id);
        toggleMutation.mutate({ labelId: label.id, isAdding });
    };

    return (
        <div className="w-72 glass rounded-xl p-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    Labels
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
                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {allLabels.map((label) => {
                        const isAssigned = isLabelAssigned(label.id);
                        const isEditing = editingLabel?.id === label.id;

                        if (isEditing) {
                            return (
                                <div key={label.id} className="space-y-2 p-2 bg-surface rounded-lg">
                                    <input
                                        type="text"
                                        value={editingLabel.name}
                                        onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                                        className="w-full px-2 py-1 bg-background border border-border rounded text-white text-sm focus:outline-none focus:border-primary"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {PRESET_COLORS.map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setEditingLabel({ ...editingLabel, color: c })}
                                                className={cn(
                                                    "w-5 h-5 rounded",
                                                    editingLabel.color === c && "ring-2 ring-white ring-offset-1 ring-offset-background"
                                                )}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => updateMutation.mutate(editingLabel)}
                                            disabled={updateMutation.isPending}
                                            className="flex-1 px-2 py-1 bg-primary text-white rounded text-xs"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditingLabel(null)}
                                            className="px-2 py-1 bg-surface-light text-text-muted rounded text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={label.id}
                                className="flex items-center gap-2 group"
                            >
                                <button
                                    onClick={() => taskId && handleToggle(label)}
                                    disabled={!taskId || toggleMutation.isPending}
                                    className={cn(
                                        "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                                        "hover:opacity-80"
                                    )}
                                    style={{ backgroundColor: label.color + '30', color: label.color }}
                                >
                                    {taskId && (
                                        <div className={cn(
                                            "w-4 h-4 rounded border flex items-center justify-center",
                                            isAssigned ? "bg-white border-white" : "border-current"
                                        )}>
                                            {isAssigned && <Check className="w-3 h-3" style={{ color: label.color }} />}
                                        </div>
                                    )}
                                    <span className="flex-1 truncate">{label.name}</span>
                                    <span className="text-xs opacity-70">{label.task_count}</span>
                                </button>
                                <button
                                    onClick={() => setEditingLabel(label)}
                                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-surface rounded transition-opacity"
                                >
                                    <Edit2 className="w-3 h-3 text-text-muted" />
                                </button>
                                <button
                                    onClick={() => deleteMutation.mutate(label.id)}
                                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3 text-red-400" />
                                </button>
                            </div>
                        );
                    })}

                    {allLabels.length === 0 && (
                        <p className="text-sm text-text-muted text-center py-4">No labels yet</p>
                    )}
                </div>
            )}

            {/* Create New Label */}
            {showCreate ? (
                <div className="space-y-3 p-3 bg-surface rounded-lg">
                    <input
                        type="text"
                        value={newLabel.name}
                        onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                        placeholder="Label name..."
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                        autoFocus
                    />
                    <div className="flex flex-wrap gap-1">
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setNewLabel({ ...newLabel, color: c })}
                                className={cn(
                                    "w-6 h-6 rounded transition-all",
                                    newLabel.color === c && "ring-2 ring-white ring-offset-1 ring-offset-background"
                                )}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => newLabel.name && createMutation.mutate(newLabel)}
                            disabled={!newLabel.name || createMutation.isPending}
                            className="flex-1 px-3 py-2 gradient-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                            Create
                        </button>
                        <button
                            onClick={() => setShowCreate(false)}
                            className="px-3 py-2 bg-surface-light text-text-muted rounded-lg text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowCreate(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-surface hover:bg-surface-light rounded-lg text-text-muted hover:text-white text-sm transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create New Label
                </button>
            )}
        </div>
    );
}

/**
 * LabelBadge - Display a single label badge
 */
export function LabelBadge({ label, size = 'md', showName = true }) {
    const sizeClasses = {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
    };

    return (
        <span
            className={cn(
                "rounded font-medium inline-flex items-center gap-1",
                sizeClasses[size]
            )}
            style={{ backgroundColor: label.color + '30', color: label.color }}
        >
            {showName ? label.name : <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />}
        </span>
    );
}

/**
 * LabelsDisplay - Display labels on a card
 */
export function LabelsDisplay({ labels = [], maxDisplay = 3, size = 'sm' }) {
    if (labels.length === 0) return null;

    const displayLabels = labels.slice(0, maxDisplay);
    const remaining = labels.length - maxDisplay;

    return (
        <div className="flex flex-wrap gap-1">
            {displayLabels.map((label) => (
                <LabelBadge key={label.id} label={label} size={size} />
            ))}
            {remaining > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-surface text-text-muted rounded">
                    +{remaining}
                </span>
            )}
        </div>
    );
}
