import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { projectsApi, usersApi, favoritesApi } from '../lib/api';
import FavoriteButton from '../components/FavoriteButton';
import { useAuth } from '../context/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    FolderKanban,
    Plus,
    Edit,
    Trash2,
    Loader2,
    X,
    Users,
    LayoutGrid,
    UserPlus,
    Check,
    Calendar,
    GripVertical
} from 'lucide-react';
import { cn, formatDate, getInitials } from '../lib/utils';

export default function Projects() {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll(),
    });

    const projects = data?.data?.data || [];

    const deleteMutation = useMutation({
        mutationFn: (id) => projectsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['projects']);
        },
    });

    const handleDelete = (project) => {
        if (confirm(`Hapus project "${project.name}"? Semua board dan task akan terhapus.`)) {
            deleteMutation.mutate(project.id);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FolderKanban className="w-6 h-6 text-primary" />
                        Projects
                    </h1>
                    <p className="text-text-muted">Kelola proyek dan papan tugas tim</p>
                </div>
                {/* Only admin can create projects */}
                {currentUser?.role === 'admin' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 gradient-primary text-white font-medium rounded-xl btn-hover flex items-center gap-2 self-start sm:self-auto"
                    >
                        <Plus className="w-4 h-4" />
                        Project Baru
                    </button>
                )}
            </div>

            {/* Projects Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : error ? (
                <div className="text-center py-12 text-red-400">
                    Error loading projects. Please try again.
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-12">
                    <FolderKanban className="w-16 h-16 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Belum ada project</h3>
                    <p className="text-text-muted mb-4">
                        {currentUser?.role === 'admin'
                            ? 'Buat project pertama untuk mulai mengelola tugas'
                            : 'Hubungi admin untuk ditambahkan ke project'}
                    </p>
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 gradient-primary text-white font-medium rounded-xl btn-hover"
                        >
                            Buat Project
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="glass rounded-xl overflow-hidden card-hover group"
                        >
                            {/* Color Header */}
                            <div
                                className="h-2"
                                style={{ backgroundColor: project.color || '#6366f1' }}
                            />

                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${project.color || '#6366f1'}20` }}
                                    >
                                        <FolderKanban className="w-5 h-5" style={{ color: project.color || '#6366f1' }} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <FavoriteButton entityType="project" entityId={project.id} />
                                        {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                                            <button
                                                onClick={() => setEditingProject(project)}
                                                className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted hover:text-white"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        )}
                                        {currentUser?.role === 'admin' && (
                                            <button
                                                onClick={() => handleDelete(project)}
                                                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-text-muted hover:text-red-400"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <Link to={`/projects/${project.id}`} className="block group/link">
                                    <h3 className="font-semibold text-white mb-1 group-hover/link:text-primary transition-colors">
                                        {project.name}
                                    </h3>
                                </Link>
                                {project.description && (
                                    <p className="text-sm text-text-muted mb-4 line-clamp-2">{project.description}</p>
                                )}

                                <div className="flex items-center justify-between text-sm text-text-muted">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <LayoutGrid className="w-4 h-4" />
                                            {project.board_count || 0} board
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {project.member_count || 1}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-border">
                                    <Link
                                        to={`/projects/${project.id}`}
                                        className="w-full py-2 px-4 bg-surface hover:bg-surface-light text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                        Buka Kanban
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || editingProject) && (
                <ProjectModal
                    project={editingProject}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingProject(null);
                    }}
                />
            )}
        </div>
    );
}

function ProjectModal({ project, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: project?.name || '',
        description: project?.description || '',
        color: project?.color || '#6366f1',
        member_ids: [],
    });
    const [template, setTemplate] = useState('kanban');
    const [customColumns, setCustomColumns] = useState([
        { id: 'col-1', name: 'To Do', color: '#3b82f6' },
        { id: 'col-2', name: 'In Progress', color: '#f59e0b' },
        { id: 'col-3', name: 'Done', color: '#10b981' }
    ]);
    const [error, setError] = useState('');
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Fetch users for member selection
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: () => usersApi.getAll({ limit: 100 }),
    });
    const users = usersData?.data?.data?.users || [];

    // Load existing project members when editing
    useEffect(() => {
        if (project?.id) {
            setLoadingMembers(true);
            projectsApi.getById(project.id)
                .then(res => {
                    const data = res.data;
                    if (data?.data?.members) {
                        const memberIds = data.data.members
                            .filter(m => m.project_role !== 'owner')
                            .map(m => m.id);
                        setFormData(prev => ({ ...prev, member_ids: memberIds }));
                    }
                })
                .finally(() => setLoadingMembers(false));
        }
    }, [project?.id]);

    const mutation = useMutation({
        mutationFn: (data) => project
            ? projectsApi.update(project.id, data)
            : projectsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['projects']);
            onClose();
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Terjadi kesalahan');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = { ...formData };

        // Add template and custom columns for new projects
        if (!project) {
            submitData.template = template;
            if (template === 'daily-task') {
                submitData.custom_columns = customColumns.map(col => ({
                    name: col.name,
                    color: col.color
                }));
            }
        }

        mutation.mutate(submitData);
    };

    const toggleMember = (userId) => {
        setFormData(prev => ({
            ...prev,
            member_ids: prev.member_ids.includes(userId)
                ? prev.member_ids.filter(id => id !== userId)
                : [...prev.member_ids, userId]
        }));
    };

    // Handle column drag end
    const handleColumnDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(customColumns);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setCustomColumns(items);
    };

    // Add new column
    const addColumn = () => {
        const newCol = {
            id: `col-${Date.now()}`,
            name: 'Kolom Baru',
            color: '#6366f1'
        };
        setCustomColumns([...customColumns, newCol]);
    };

    // Remove column
    const removeColumn = (id) => {
        if (customColumns.length <= 1) return; // Keep at least one column
        setCustomColumns(customColumns.filter(col => col.id !== id));
    };

    // Update column
    const updateColumn = (id, field, value) => {
        setCustomColumns(customColumns.map(col =>
            col.id === id ? { ...col, [field]: value } : col
        ));
    };

    const presetColors = [
        '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'
    ];

    const columnColors = [
        '#64748b', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981',
        '#ef4444', '#ec4899', '#06b6d4', '#f97316'
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl w-full max-w-lg animate-fadeIn max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-bold text-white">
                        {project ? 'Edit Project' : 'Buat Project Baru'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="bg-danger/10 border border-danger/30 text-red-400 text-sm rounded-lg p-3">
                            {error}
                        </div>
                    )}

                    {/* Template Selection - Only for new projects */}
                    {!project && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted">Pilih Template</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTemplate('kanban')}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all text-left",
                                        template === 'kanban'
                                            ? "border-primary bg-primary/10"
                                            : "border-border hover:border-primary/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <FolderKanban className="w-5 h-5 text-primary" />
                                        <span className="font-medium text-white">Kanban</span>
                                    </div>
                                    <p className="text-xs text-text-muted">
                                        Template standar dengan kolom Backlog, To Do, In Progress, Review, Done
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTemplate('daily-task')}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all text-left",
                                        template === 'daily-task'
                                            ? "border-primary bg-primary/10"
                                            : "border-border hover:border-primary/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="w-5 h-5 text-orange-400" />
                                        <span className="font-medium text-white">Daily Task</span>
                                    </div>
                                    <p className="text-xs text-text-muted">
                                        Kolom yang bisa dikustomisasi sesuai kebutuhan
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Custom Columns Editor - Only for daily-task template */}
                    {!project && template === 'daily-task' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" />
                                Kolom Board ({customColumns.length})
                            </label>
                            <div className="bg-surface rounded-xl border border-border p-3">
                                <DragDropContext onDragEnd={handleColumnDragEnd}>
                                    <Droppable droppableId="columns">
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className="space-y-2"
                                            >
                                                {customColumns.map((col, index) => (
                                                    <Draggable
                                                        key={col.id}
                                                        draggableId={col.id}
                                                        index={index}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={cn(
                                                                    "flex items-center gap-2 p-2 rounded-lg bg-background transition-all",
                                                                    snapshot.isDragging && "shadow-lg ring-2 ring-primary"
                                                                )}
                                                            >
                                                                <div
                                                                    {...provided.dragHandleProps}
                                                                    className="p-1 cursor-grab text-text-muted hover:text-white"
                                                                >
                                                                    <GripVertical className="w-4 h-4" />
                                                                </div>
                                                                <div
                                                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: col.color }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={col.name}
                                                                    onChange={(e) => updateColumn(col.id, 'name', e.target.value)}
                                                                    className="flex-1 px-2 py-1 bg-surface border border-border rounded text-white text-sm focus:outline-none focus:border-primary"
                                                                    placeholder="Nama kolom"
                                                                />
                                                                {/* Color picker dropdown */}
                                                                <div className="relative group">
                                                                    <button
                                                                        type="button"
                                                                        className="p-1.5 hover:bg-surface rounded transition-colors"
                                                                        title="Ubah warna"
                                                                    >
                                                                        <div
                                                                            className="w-4 h-4 rounded border border-white/20"
                                                                            style={{ backgroundColor: col.color }}
                                                                        />
                                                                    </button>
                                                                    <div className="absolute right-0 top-full mt-1 p-2 bg-surface border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex gap-1 flex-wrap w-[120px]">
                                                                        {columnColors.map(color => (
                                                                            <button
                                                                                key={color}
                                                                                type="button"
                                                                                onClick={() => updateColumn(col.id, 'color', color)}
                                                                                className={cn(
                                                                                    "w-5 h-5 rounded transition-all",
                                                                                    col.color === color && "ring-2 ring-white"
                                                                                )}
                                                                                style={{ backgroundColor: color }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeColumn(col.id)}
                                                                    disabled={customColumns.length <= 1}
                                                                    className={cn(
                                                                        "p-1.5 rounded transition-colors",
                                                                        customColumns.length <= 1
                                                                            ? "text-text-muted/30 cursor-not-allowed"
                                                                            : "text-text-muted hover:text-red-400 hover:bg-red-500/10"
                                                                    )}
                                                                    title="Hapus kolom"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                                <button
                                    type="button"
                                    onClick={addColumn}
                                    className="w-full mt-2 py-2 px-3 border border-dashed border-border rounded-lg text-sm text-text-muted hover:text-white hover:border-primary transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Tambah Kolom
                                </button>
                            </div>
                            <p className="text-xs text-text-muted">
                                Drag untuk mengubah urutan. Minimal 1 kolom diperlukan.
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Nama Project</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="contoh: Website Redesign"
                            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Deskripsi (opsional)</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Deskripsi singkat project..."
                            rows={2}
                            className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Warna</label>
                        <div className="flex items-center gap-2 flex-wrap">
                            {presetColors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color })}
                                    className={cn(
                                        "w-8 h-8 rounded-lg transition-all",
                                        formData.color === color && "ring-2 ring-white ring-offset-2 ring-offset-background"
                                    )}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Members Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Anggota Tim ({formData.member_ids.length} dipilih)
                            {loadingMembers && <Loader2 className="w-3 h-3 animate-spin" />}
                        </label>
                        <div className="max-h-48 overflow-y-auto bg-surface rounded-xl border border-border p-2 space-y-1">
                            {users.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => toggleMember(user.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                                        formData.member_ids.includes(user.id)
                                            ? "bg-primary/20 text-primary"
                                            : "hover:bg-surface-light text-white"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                                        {getInitials(user.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{user.name}</p>
                                        <p className="text-xs text-text-muted truncate">{user.email} • {user.role}</p>
                                    </div>
                                    {formData.member_ids.includes(user.id) && (
                                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-text-muted">
                            Pilih user yang akan menjadi anggota project ini. Mereka bisa melihat tasks dan di-assign.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-surface border border-border text-white rounded-xl hover:bg-surface-light transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-1 px-4 py-2 gradient-primary text-white rounded-xl btn-hover disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            {project ? 'Simpan' : 'Buat'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
