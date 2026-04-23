import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi, usersApi, commentsApi, attachmentsApi, labelsApi, API_URL } from '../lib/api';
import ConfirmModal from './ConfirmModal';
import { WatchButton } from './MembersDropdown';
import VoteButton from './VoteButton';
import LabelsManager, { LabelsDisplay } from './LabelsManager';
import ActivityLog from './ActivityLog';
import TaskDependencies from './TaskDependencies';
import MentionTextarea from './MentionTextarea';
import {
    X,
    User,
    Calendar,
    Check,
    Trash2,
    Plus,
    MessageSquare,
    CheckSquare,
    Loader2,
    MoreHorizontal,
    ChevronDown,
    ChevronRight,
    Send,
    AlignLeft,
    Paperclip,
    FileText,
    Image,
    Download,
    Bold,
    Italic,
    Link,
    List,
    Edit3,
    Tag,
    History,
    Link2
} from 'lucide-react';
import { cn, formatDate, getInitials, getSeverityColor, formatDateTime, getTimeAgo, formatMarkdown } from '../lib/utils';

const API_BASE = `${API_URL}/api`;

const typeConfig = {
    epic: { emoji: '⚡', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', label: 'Epic' },
    story: { emoji: '📖', color: 'bg-green-500/20 text-green-400 border-green-500/50', label: 'Story' },
    task: { emoji: '✅', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', label: 'Task' },
    bug: { emoji: '🐛', color: 'bg-red-500/20 text-red-400 border-red-500/50', label: 'Bug' },
};

export default function TaskModal({ task, columnId, boardId, currentUser, onClose }) {
    const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState('main');
    const [isEditing, setIsEditing] = useState(!task);
    const [formData, setFormData] = useState({
        title: task?.title || '',
        description: task?.description || '',
        type: task?.type || 'task',
        severity: task?.severity || 'minor',
        start_date: task?.start_date || '',
        due_date: task?.due_date || '',
        assignee_id: task?.assignee_id || '',
        column_id: columnId,
    });
    const [error, setError] = useState('');
    const [newComment, setNewComment] = useState('');
    const [newChecklistTitle, setNewChecklistTitle] = useState('');
    const [showAddChecklist, setShowAddChecklist] = useState(false);
    const [newItemContent, setNewItemContent] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentContent, setEditCommentContent] = useState('');
    const [editCommentAttachment, setEditCommentAttachment] = useState(null);
    const [editCommentExistingAttachment, setEditCommentExistingAttachment] = useState(null);
    const [commentAttachment, setCommentAttachment] = useState(null);
    const [isUploadingComment, setIsUploadingComment] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: null, id: null, title: '' });
    const [showLabels, setShowLabels] = useState(false);
    const [showDependencies, setShowDependencies] = useState(false);
    const fileInputRef = useRef(null);
    const commentFileRef = useRef(null);
    const editCommentFileRef = useRef(null);
    const commentTextRef = useRef(null);
    const editCommentTextRef = useRef(null);

    // Rich text formatting helper
    const insertFormat = (prefix, suffix = '') => {
        const textarea = commentTextRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = newComment;
        const selectedText = text.substring(start, end);

        const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
        setNewComment(newText);

        // Restore focus and cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    // Rich text formatting for edit mode
    const insertEditFormat = (prefix, suffix = '') => {
        const textarea = editCommentTextRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = editCommentContent;
        const selectedText = text.substring(start, end);

        const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
        setEditCommentContent(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    // Handle comment update with attachment
    const handleUpdateComment = async (commentId) => {
        if (!editCommentContent.trim() && !editCommentAttachment && !editCommentExistingAttachment) return;

        setIsUploadingComment(true);
        try {
            let attachmentName = editCommentExistingAttachment?.name || null;
            let attachmentPath = editCommentExistingAttachment?.path || null;

            // Upload new attachment if exists
            if (editCommentAttachment) {
                const uploadRes = await attachmentsApi.upload(task.id, editCommentAttachment);
                if (uploadRes?.data?.data) {
                    attachmentName = uploadRes.data.data.original_name || editCommentAttachment.name;
                    attachmentPath = uploadRes.data.data.file_path;
                }
            }

            // Update comment
            updateCommentMutation.mutate({
                id: commentId,
                content: editCommentContent || '📎 Attachment',
                attachment_name: attachmentName,
                attachment_path: attachmentPath
            });
        } catch (err) {
            console.error('Failed to update comment:', err);
        } finally {
            setIsUploadingComment(false);
        }
    };

    // Handle comment submission with attachment
    const handleSubmitComment = async () => {
        if (!newComment.trim() && !commentAttachment) return;

        setIsUploadingComment(true);
        try {
            let attachmentName = null;
            let attachmentPath = null;

            // Upload attachment first if exists
            if (commentAttachment) {
                const uploadRes = await attachmentsApi.upload(task.id, commentAttachment);
                console.log('Upload response:', uploadRes.data);

                if (uploadRes?.data?.data) {
                    // Match field names from upload.php response
                    attachmentName = uploadRes.data.data.original_name || commentAttachment.name;
                    attachmentPath = uploadRes.data.data.file_path;
                    console.log('Attachment saved:', { attachmentName, attachmentPath });
                } else {
                    console.error('Upload failed:', uploadRes.data);
                }
            }

            // Create comment
            const commentData = {
                task_id: task.id,
                content: newComment || '📎 Attachment',
                attachment_name: attachmentName,
                attachment_path: attachmentPath
            };
            console.log('Creating comment with:', commentData);

            await commentsApi.create(commentData);

            setNewComment('');
            setCommentAttachment(null);
            refetchComments();
        } catch (err) {
            console.error('Failed to submit comment:', err);
        } finally {
            setIsUploadingComment(false);
        }
    };

    const canEdit = !task ||
        currentUser?.role === 'admin' ||
        currentUser?.role === 'manager' ||
        task?.created_by == currentUser?.id ||
        task?.assignee_id == currentUser?.id;

    // Fetch users (using basic list that doesn't require admin permission)
    const { data: usersData } = useQuery({
        queryKey: ['users-basic'],
        queryFn: () => usersApi.getBasicList(),
    });
    const users = usersData?.data?.data?.users || [];

    // Fetch checklists
    const { data: checklistsData, refetch: refetchChecklists } = useQuery({
        queryKey: ['checklists', task?.id],
        queryFn: () => fetch(`${API_BASE}/checklists/index.php?task_id=${task.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }).then(res => res.json()),
        enabled: !!task?.id,
    });
    const checklists = checklistsData?.data || [];

    // Fetch comments
    const { data: commentsData, refetch: refetchComments } = useQuery({
        queryKey: ['comments', task?.id],
        queryFn: () => commentsApi.getByTask(task.id),
        enabled: !!task?.id,
    });
    const comments = commentsData?.data?.data || [];

    // Fetch attachments
    const { data: attachmentsData, refetch: refetchAttachments } = useQuery({
        queryKey: ['attachments', task?.id],
        queryFn: () => attachmentsApi.getByTask(task.id),
        enabled: !!task?.id,
    });
    const attachments = attachmentsData?.data?.data || [];

    // Calculate total checklist progress
    const totalItems = checklists.reduce((acc, cl) => acc + (cl.total_items || 0), 0);
    const completedItems = checklists.reduce((acc, cl) => acc + (cl.completed_items || 0), 0);
    const checklistProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Mutations
    const createTaskMutation = useMutation({
        mutationFn: (data) => tasksApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['board', boardId]);
            onClose();
        },
        onError: (err) => setError(err.response?.data?.message || 'Gagal membuat task'),
    });

    const updateTaskMutation = useMutation({
        mutationFn: (data) => tasksApi.update(task.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['board', boardId]);
            setIsEditing(false);
        },
        onError: (err) => setError(err.response?.data?.message || 'Gagal update task'),
    });

    const deleteTaskMutation = useMutation({
        mutationFn: () => tasksApi.delete(task.id),
        onSuccess: () => {
            queryClient.invalidateQueries(['board', boardId]);
            onClose();
        },
    });

    const addCommentMutation = useMutation({
        mutationFn: () => commentsApi.create({ task_id: task.id, content: newComment }),
        onSuccess: () => {
            setNewComment('');
            setCommentAttachment(null);
            refetchComments();
        },
    });

    const updateCommentMutation = useMutation({
        mutationFn: ({ id, content, attachment_name, attachment_path }) => commentsApi.update(id, { content, attachment_name, attachment_path }),
        onSuccess: () => {
            setEditingCommentId(null);
            setEditCommentContent('');
            setEditCommentAttachment(null);
            setEditCommentExistingAttachment(null);
            refetchComments();
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: (id) => commentsApi.delete(id),
        onSuccess: () => refetchComments(),
    });

    const createChecklistMutation = useMutation({
        mutationFn: (title) => fetch(`${API_BASE}/checklists/create.php`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ task_id: task.id, title })
        }),
        onSuccess: () => {
            setNewChecklistTitle('');
            setShowAddChecklist(false);
            refetchChecklists();
        },
    });

    const deleteChecklistMutation = useMutation({
        mutationFn: (checklistId) => fetch(`${API_BASE}/checklists/delete.php?id=${checklistId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }),
        onSuccess: () => refetchChecklists(),
    });

    const addItemMutation = useMutation({
        mutationFn: ({ checklistId, content }) => fetch(`${API_BASE}/checklists/add-item.php`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ checklist_id: checklistId, content })
        }),
        onSuccess: () => refetchChecklists(),
    });

    const toggleItemMutation = useMutation({
        mutationFn: async (itemId) => {
            const res = await fetch(`${API_BASE}/checklists/toggle-item.php?id=${itemId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            });
            return res.json();
        },
        onSuccess: () => {
            refetchChecklists();
            queryClient.invalidateQueries(['board', boardId]);
        },
    });

    const deleteItemMutation = useMutation({
        mutationFn: (itemId) => fetch(`${API_BASE}/checklists/delete-item.php?id=${itemId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }),
        onSuccess: () => refetchChecklists(),
    });

    // Update checklist title mutation
    const updateChecklistMutation = useMutation({
        mutationFn: ({ checklistId, title }) => fetch(`${API_BASE}/checklists/update.php?id=${checklistId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        }),
        onSuccess: () => refetchChecklists(),
    });

    // Update checklist item mutation
    const updateItemMutation = useMutation({
        mutationFn: ({ itemId, content, progress }) => fetch(`${API_BASE}/checklists/update-item.php?id=${itemId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content, progress })
        }),
        onSuccess: () => {
            refetchChecklists();
            queryClient.invalidateQueries(['board', boardId]);
        },
    });

    // Attachment mutations
    const uploadAttachmentMutation = useMutation({
        mutationFn: (file) => attachmentsApi.upload(task.id, file),
        onSuccess: () => {
            refetchAttachments();
            setIsUploading(false);
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Gagal upload file');
            setIsUploading(false);
        },
    });

    const deleteAttachmentMutation = useMutation({
        mutationFn: (id) => attachmentsApi.delete(id),
        onSuccess: () => refetchAttachments(),
    });

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            uploadAttachmentMutation.mutate(file);
        }
        e.target.value = '';
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            setError('Judul task wajib diisi');
            return;
        }
        if (task) {
            updateTaskMutation.mutate(formData);
        } else {
            createTaskMutation.mutate(formData);
        }
    };

    const handleAddItem = (checklistId) => {
        const content = newItemContent[checklistId]?.trim();
        if (!content) return;
        addItemMutation.mutate({ checklistId, content });
        setNewItemContent({ ...newItemContent, [checklistId]: '' });
    };

    const type = typeConfig[formData.type] || typeConfig.task;
    const assignee = users.find(u => u.id == formData.assignee_id);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
            <div className="glass rounded-2xl w-full max-w-3xl animate-fadeIn mb-8">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-border">
                    <div className="flex items-start gap-3 flex-1">
                        <span className={cn("text-lg px-2 py-1 rounded", type.color)}>
                            {type.emoji}
                        </span>
                        <div className="flex-1">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Judul Task"
                                    className="w-full text-xl font-bold bg-transparent border-b border-border text-white focus:outline-none focus:border-primary pb-1"
                                    autoFocus
                                />
                            ) : (
                                <h2 className="text-xl font-bold text-white">{task?.title}</h2>
                            )}
                            {task?.column_name && (
                                <p className="text-sm text-text-muted mt-1">
                                    Status: <span className="text-white">{task.column_name}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Tab Navigation */}
                {task && (
                    <div className="flex items-center gap-6 px-6 border-b border-border">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={cn(
                                "py-3 text-sm font-medium border-b-2 transition-colors",
                                activeTab === 'details'
                                    ? "text-primary border-primary"
                                    : "text-text-muted border-transparent hover:text-white"
                            )}
                        >
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={cn(
                                "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                activeTab === 'comments'
                                    ? "text-primary border-primary"
                                    : "text-text-muted border-transparent hover:text-white"
                            )}
                        >
                            <MessageSquare className="w-4 h-4" />
                            Comments ({comments.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('activity')}
                            className={cn(
                                "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                activeTab === 'activity'
                                    ? "text-primary border-primary"
                                    : "text-text-muted border-transparent hover:text-white"
                            )}
                        >
                            <History className="w-4 h-4" />
                            Activity
                        </button>
                    </div>
                )}

                {/* Content - 2 Column Layout */}
                <div className="flex flex-col lg:flex-row">
                    {/* Main Content */}
                    <div className="flex-1 p-6 space-y-6">
                        {/* Details Tab Content */}
                        {activeTab === 'details' && (
                            <>
                                {/* Members & Type Row */}
                                <div className="flex flex-wrap items-center gap-4">
                                    {/* Assignee */}
                                    <div>
                                        <p className="text-xs text-text-muted mb-2">ASSIGNEE</p>
                                        {isEditing ? (
                                            <select
                                                value={formData.assignee_id}
                                                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                                                className="px-3 py-2 bg-surface border border-border rounded-lg text-white text-sm"
                                            >
                                                <option value="">-- Pilih --</option>
                                                {users.map((u) => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {assignee ? (
                                                    <>
                                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                                                            {getInitials(assignee.name)}
                                                        </div>
                                                        <span className="text-white text-sm">{assignee.name}</span>
                                                    </>
                                                ) : task?.assignee_name ? (
                                                    <>
                                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                                                            {getInitials(task.assignee_name)}
                                                        </div>
                                                        <span className="text-white text-sm">{task.assignee_name}</span>
                                                    </>
                                                ) : (
                                                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 text-text-muted hover:text-white text-sm">
                                                        <User className="w-4 h-4" /> Assign
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Type */}
                                    <div>
                                        <p className="text-xs text-text-muted mb-2">TYPE</p>
                                        {isEditing ? (
                                            <div className="flex gap-1">
                                                {Object.entries(typeConfig).map(([key, cfg]) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, type: key })}
                                                        className={cn(
                                                            "px-2 py-1 rounded text-xs font-medium border transition-all",
                                                            formData.type === key
                                                                ? cfg.color + " ring-1 ring-offset-1 ring-offset-background"
                                                                : "bg-surface border-border text-text-muted hover:border-primary/50"
                                                        )}
                                                    >
                                                        {cfg.emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className={cn("text-xs px-2 py-1 rounded border", type.color)}>
                                                {type.emoji} {type.label}
                                            </span>
                                        )}
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <p className="text-xs text-text-muted mb-2">PRIORITY</p>
                                        {isEditing ? (
                                            <select
                                                value={formData.severity}
                                                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                                                className="px-3 py-2 bg-surface border border-border rounded-lg text-white text-sm"
                                            >
                                                <option value="minor">Minor</option>
                                                <option value="major">Major</option>
                                                <option value="critical">Critical</option>
                                            </select>
                                        ) : (
                                            <span className={cn("text-xs px-2 py-1 rounded border", getSeverityColor(formData.severity))}>
                                                {formData.severity}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Dates - Start & Due */}
                                <div className="flex flex-wrap gap-4">
                                    {/* Start Date */}
                                    {(isEditing || formData.start_date) && (
                                        <div>
                                            <p className="text-xs text-text-muted mb-2">START DATE</p>
                                            {isEditing ? (
                                                <input
                                                    type="date"
                                                    value={formData.start_date}
                                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                                    className="px-3 py-2 bg-surface border border-border rounded-lg text-white text-sm"
                                                />
                                            ) : (
                                                <span className="flex items-center gap-1 text-sm text-white">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(formData.start_date)}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Due Date */}
                                    {(isEditing || formData.due_date) && (
                                        <div>
                                            <p className="text-xs text-text-muted mb-2">DUE DATE</p>
                                            {isEditing ? (
                                                <input
                                                    type="date"
                                                    value={formData.due_date}
                                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                                    className="px-3 py-2 bg-surface border border-border rounded-lg text-white text-sm"
                                                />
                                            ) : (
                                                <span className={cn(
                                                    "flex items-center gap-1 text-sm",
                                                    new Date(formData.due_date) < new Date() ? "text-red-400" : "text-white"
                                                )}>
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(formData.due_date)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlignLeft className="w-4 h-4 text-text-muted" />
                                        <p className="text-xs text-text-muted font-medium">DESCRIPTION</p>
                                        {!isEditing && canEdit && (
                                            <button onClick={() => setIsEditing(true)} className="text-xs text-primary hover:underline">Edit</button>
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Tambahkan deskripsi..."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary resize-none"
                                        />
                                    ) : (
                                        <p className="text-white text-sm whitespace-pre-wrap">
                                            {task?.description || <span className="text-text-muted italic">Tidak ada deskripsi</span>}
                                        </p>
                                    )}
                                </div>

                                {/* Checklists */}
                                {task && (
                                    <div className="space-y-4">
                                        {checklists.map((checklist) => (
                                            <ChecklistSection
                                                key={checklist.id}
                                                checklist={checklist}
                                                onToggleItem={(itemId) => toggleItemMutation.mutate(itemId)}
                                                onDeleteItem={(itemId) => deleteItemMutation.mutate(itemId)}
                                                onDeleteChecklist={() => deleteChecklistMutation.mutate(checklist.id)}
                                                onAddItem={(content) => addItemMutation.mutate({ checklistId: checklist.id, content })}
                                                onUpdateChecklist={(title) => updateChecklistMutation.mutate({ checklistId: checklist.id, title })}
                                                onUpdateItem={(itemId, data) => updateItemMutation.mutate({ itemId, ...data })}
                                                newItemContent={newItemContent[checklist.id] || ''}
                                                setNewItemContent={(val) => setNewItemContent({ ...newItemContent, [checklist.id]: val })}
                                            />
                                        ))}

                                        {showAddChecklist ? (
                                            <div className="bg-surface/50 rounded-xl p-4">
                                                <input
                                                    type="text"
                                                    value={newChecklistTitle}
                                                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                                                    placeholder="Nama checklist..."
                                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-white text-sm focus:outline-none focus:border-primary mb-3"
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => newChecklistTitle.trim() && createChecklistMutation.mutate(newChecklistTitle)}
                                                        disabled={createChecklistMutation.isPending}
                                                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                                                    >
                                                        Tambah
                                                    </button>
                                                    <button
                                                        onClick={() => { setShowAddChecklist(false); setNewChecklistTitle(''); }}
                                                        className="px-4 py-2 text-text-muted hover:text-white text-sm"
                                                    >
                                                        Batal
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowAddChecklist(true)}
                                                className="flex items-center gap-2 text-text-muted hover:text-white text-sm py-2"
                                            >
                                                <CheckSquare className="w-4 h-4" />
                                                Tambah Checklist
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Attachments */}
                                {task && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Paperclip className="w-4 h-4 text-text-muted" />
                                            <p className="text-xs text-text-muted font-medium">ATTACHMENTS</p>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                                        />

                                        {attachments.length > 0 && (
                                            <div className="space-y-4 mb-4">
                                                {attachments.map((attachment) => {
                                                    const isImage = attachment.file_type?.startsWith('image/') || attachment.mime_type?.startsWith('image/');
                                                    const fileUrl = `${API_URL}/${attachment.file_path}`;
                                                    const timeAgo = getTimeAgo(attachment.created_at);

                                                    return (
                                                        <div key={attachment.id} className="flex gap-4">
                                                            {/* Thumbnail */}
                                                            {isImage ? (
                                                                <button
                                                                    onClick={() => setPreviewImage({ url: fileUrl, name: attachment.original_name || attachment.filename })}
                                                                    className="w-28 h-20 rounded-lg bg-surface overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
                                                                >
                                                                    <img
                                                                        src={fileUrl}
                                                                        alt={attachment.original_name || attachment.filename}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </button>
                                                            ) : (
                                                                <div className="w-28 h-20 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                                                                    <FileText className="w-8 h-8 text-text-muted" />
                                                                </div>
                                                            )}

                                                            {/* Info & Actions */}
                                                            <div className="flex-1 min-w-0 py-1">
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <a
                                                                        href={fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-sm font-medium text-white hover:underline truncate"
                                                                    >
                                                                        {attachment.original_name || attachment.filename}
                                                                    </a>
                                                                    <span className="text-text-muted">↗</span>
                                                                </div>
                                                                <p className="text-xs text-text-muted mb-2">
                                                                    {timeAgo}
                                                                    {attachment.file_size && ` • ${(attachment.file_size / 1024).toFixed(1)} KB`}
                                                                </p>
                                                                <div className="flex items-center gap-3 text-xs">
                                                                    <a
                                                                        href={fileUrl}
                                                                        download
                                                                        className="text-text-muted hover:text-white hover:underline"
                                                                    >
                                                                        Download
                                                                    </a>
                                                                    {canEdit && (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (confirm('Hapus attachment ini?')) {
                                                                                    deleteAttachmentMutation.mutate(attachment.id);
                                                                                }
                                                                            }}
                                                                            className="text-text-muted hover:text-red-400 hover:underline"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Add Attachment Button */}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-light rounded-lg text-white text-sm transition-colors disabled:opacity-50"
                                        >
                                            {isUploading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Plus className="w-4 h-4" />
                                            )}
                                            Add an attachment
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Comments Tab Content */}
                        {activeTab === 'comments' && task && (
                            <div className="space-y-4">
                                {/* Add Comment */}
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium flex-shrink-0">
                                        {getInitials(currentUser?.name || 'U')}
                                    </div>
                                    <div className="flex-1">
                                        {/* Rich Text Toolbar */}
                                        <div className="flex items-center gap-1 mb-2 p-2 bg-surface/50 rounded-lg border border-border">
                                            <button
                                                onClick={() => insertFormat('**', '**')}
                                                className="p-1.5 hover:bg-surface rounded text-text-muted hover:text-white transition-colors"
                                                title="Bold"
                                            >
                                                <Bold className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => insertFormat('_', '_')}
                                                className="p-1.5 hover:bg-surface rounded text-text-muted hover:text-white transition-colors"
                                                title="Italic"
                                            >
                                                <Italic className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => insertFormat('[', '](url)')}
                                                className="p-1.5 hover:bg-surface rounded text-text-muted hover:text-white transition-colors"
                                                title="Link"
                                            >
                                                <Link className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => insertFormat('\n- ', '')}
                                                className="p-1.5 hover:bg-surface rounded text-text-muted hover:text-white transition-colors"
                                                title="List"
                                            >
                                                <List className="w-4 h-4" />
                                            </button>
                                            <div className="ml-auto flex items-center gap-2">
                                                <input
                                                    type="file"
                                                    ref={commentFileRef}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) setCommentAttachment(file);
                                                    }}
                                                    className="hidden"
                                                />
                                                <button
                                                    onClick={() => commentFileRef.current?.click()}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
                                                >
                                                    <Paperclip className="w-3 h-3" />
                                                    Attach
                                                </button>
                                            </div>
                                        </div>

                                        <MentionTextarea
                                            ref={commentTextRef}
                                            value={newComment}
                                            onChange={(val) => setNewComment(val)}
                                            users={users}
                                            placeholder="Write a comment... (use @mention, **bold**, _italic_)"
                                            rows={3}
                                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-white text-sm focus:outline-none focus:border-primary resize-none"
                                        />

                                        {commentAttachment && (
                                            <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/30 rounded-lg mt-2">
                                                <Paperclip className="w-4 h-4 text-primary" />
                                                <span className="text-xs text-white flex-1 truncate">{commentAttachment.name}</span>
                                                <button
                                                    onClick={() => setCommentAttachment(null)}
                                                    className="p-1 hover:bg-surface rounded text-text-muted hover:text-red-400"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-xs text-text-muted">Markdown formatting supported</p>
                                            <button
                                                onClick={handleSubmitComment}
                                                disabled={(!newComment.trim() && !commentAttachment) || isUploadingComment}
                                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isUploadingComment ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments List */}
                                {comments.length > 0 ? (
                                    <div className="space-y-4">
                                        {comments.map((comment) => {
                                            const isOwner = comment.user_id == currentUser?.id;
                                            const isEditing = editingCommentId === comment.id;

                                            return (
                                                <div key={comment.id} className="flex gap-3 group">
                                                    <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                                        {getInitials(comment.author_name || comment.user_name || 'User')}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-white text-sm font-medium">{comment.author_name || comment.user_name || 'User'}</span>
                                                            <span className="text-text-muted text-xs">{getTimeAgo(comment.created_at)}</span>
                                                            {isOwner && !isEditing && (
                                                                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingCommentId(comment.id);
                                                                            setEditCommentContent(comment.content);
                                                                            if (comment.attachment_name && comment.attachment_path) {
                                                                                setEditCommentExistingAttachment({
                                                                                    name: comment.attachment_name,
                                                                                    path: comment.attachment_path
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="p-1 hover:bg-surface rounded text-text-muted hover:text-white"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit3 className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeleteConfirm({
                                                                            show: true,
                                                                            type: 'comment',
                                                                            id: comment.id,
                                                                            title: 'Delete Comment'
                                                                        })}
                                                                        className="p-1 hover:bg-surface rounded text-text-muted hover:text-red-400"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {isEditing ? (
                                                            <div className="space-y-2">
                                                                {/* Edit Toolbar */}
                                                                <div className="flex items-center gap-1 p-2 bg-surface/50 rounded-lg border border-border">
                                                                    <button
                                                                        onClick={() => insertEditFormat('**', '**')}
                                                                        className="p-1.5 hover:bg-surface rounded text-text-muted hover:text-white transition-colors"
                                                                        title="Bold"
                                                                    >
                                                                        <Bold className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => insertEditFormat('_', '_')}
                                                                        className="p-1.5 hover:bg-surface rounded text-text-muted hover:text-white transition-colors"
                                                                        title="Italic"
                                                                    >
                                                                        <Italic className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => insertEditFormat('[', '](url)')}
                                                                        className="p-1.5 hover:bg-surface rounded text-text-muted hover:text-white transition-colors"
                                                                        title="Link"
                                                                    >
                                                                        <Link className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => insertEditFormat('\n- ', '')}
                                                                        className="p-1.5 hover:bg-surface rounded text-text-muted hover:text-white transition-colors"
                                                                        title="List"
                                                                    >
                                                                        <List className="w-4 h-4" />
                                                                    </button>
                                                                    <div className="ml-auto flex items-center gap-2">
                                                                        <input
                                                                            type="file"
                                                                            ref={editCommentFileRef}
                                                                            onChange={(e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (file) {
                                                                                    setEditCommentAttachment(file);
                                                                                    setEditCommentExistingAttachment(null);
                                                                                }
                                                                            }}
                                                                            className="hidden"
                                                                        />
                                                                        <button
                                                                            onClick={() => editCommentFileRef.current?.click()}
                                                                            className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
                                                                        >
                                                                            <Paperclip className="w-3 h-3" />
                                                                            Attach
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <MentionTextarea
                                                                    ref={editCommentTextRef}
                                                                    value={editCommentContent}
                                                                    onChange={(val) => setEditCommentContent(val)}
                                                                    users={users}
                                                                    rows={3}
                                                                    placeholder="Write a comment... (use @mention, **bold**, _italic_)"
                                                                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-white text-sm focus:outline-none focus:border-primary resize-none"
                                                                />

                                                                {/* New attachment preview */}
                                                                {editCommentAttachment && (
                                                                    <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/30 rounded-lg">
                                                                        <Paperclip className="w-4 h-4 text-primary" />
                                                                        <span className="text-xs text-white flex-1 truncate">{editCommentAttachment.name}</span>
                                                                        <button
                                                                            onClick={() => setEditCommentAttachment(null)}
                                                                            className="p-1 hover:bg-surface rounded text-text-muted hover:text-red-400"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Existing attachment preview */}
                                                                {editCommentExistingAttachment && !editCommentAttachment && (
                                                                    <div className="flex items-center gap-2 p-2 bg-surface/50 rounded-lg">
                                                                        <Paperclip className="w-4 h-4 text-text-muted" />
                                                                        <span className="text-xs text-white flex-1 truncate">{editCommentExistingAttachment.name}</span>
                                                                        <button
                                                                            onClick={() => setEditCommentExistingAttachment(null)}
                                                                            className="p-1 hover:bg-surface rounded text-text-muted hover:text-red-400"
                                                                            title="Remove attachment"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingCommentId(null);
                                                                            setEditCommentContent('');
                                                                            setEditCommentAttachment(null);
                                                                            setEditCommentExistingAttachment(null);
                                                                        }}
                                                                        className="px-3 py-1.5 text-sm text-text-muted hover:text-white"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateComment(comment.id)}
                                                                        disabled={(!editCommentContent.trim() && !editCommentAttachment && !editCommentExistingAttachment) || isUploadingComment}
                                                                        className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                                                                    >
                                                                        {isUploadingComment ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                        ) : (
                                                                            <Check className="w-3 h-3" />
                                                                        )}
                                                                        Save
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div
                                                                    className="text-white text-sm bg-surface/50 px-4 py-3 rounded-xl"
                                                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(comment.content) }}
                                                                />
                                                                {comment.attachment_name && comment.attachment_path && (
                                                                    <a
                                                                        href={`${API_URL}/${comment.attachment_path}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-surface hover:bg-surface-light rounded-lg text-xs text-white transition-colors"
                                                                    >
                                                                        <Paperclip className="w-3 h-3" />
                                                                        {comment.attachment_name}
                                                                    </a>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                                        <p className="text-text-muted">No comments yet</p>
                                        <p className="text-text-muted text-sm">Be the first to comment</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Activity Tab Content */}
                        {activeTab === 'activity' && task && (
                            <div className="py-2">
                                <ActivityLog taskId={task.id} />
                            </div>
                        )}
                    </div>

                    {/* Sidebar Actions */}
                    {activeTab === 'details' && (
                        <div className="lg:w-56 p-6 lg:border-l border-border space-y-4">
                            <div>
                                <p className="text-xs text-text-muted font-medium mb-3">ADD TO CARD</p>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setShowAddChecklist(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-light rounded-lg text-white text-sm transition-colors"
                                    >
                                        <CheckSquare className="w-4 h-4" />
                                        Checklist
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-light rounded-lg text-white text-sm transition-colors"
                                    >
                                        <Calendar className="w-4 h-4" />
                                        Due Date
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-light rounded-lg text-white text-sm transition-colors"
                                    >
                                        <User className="w-4 h-4" />
                                        Assignee
                                    </button>
                                    {task && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-light rounded-lg text-white text-sm transition-colors"
                                        >
                                            <Paperclip className="w-4 h-4" />
                                            Attachment
                                        </button>
                                    )}
                                    {task && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowLabels(!showLabels)}
                                                className="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-light rounded-lg text-white text-sm transition-colors"
                                            >
                                                <Tag className="w-4 h-4" />
                                                Labels
                                            </button>
                                            {showLabels && (
                                                <div className="absolute right-0 top-full mt-2 z-50">
                                                    <LabelsManager
                                                        boardId={boardId}
                                                        taskId={task.id}
                                                        taskLabels={task.labels || []}
                                                        onClose={() => setShowLabels(false)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {task && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowDependencies(!showDependencies)}
                                                className="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-light rounded-lg text-white text-sm transition-colors"
                                            >
                                                <Link2 className="w-4 h-4" />
                                                Dependencies
                                            </button>
                                            {showDependencies && (
                                                <div className="absolute right-0 top-full mt-2 z-50">
                                                    <TaskDependencies
                                                        taskId={task.id}
                                                        boardId={boardId}
                                                        onClose={() => setShowDependencies(false)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Watch & Vote */}
                            {task && (
                                <div>
                                    <p className="text-xs text-text-muted font-medium mb-3">ENGAGEMENT</p>
                                    <div className="flex gap-2">
                                        <WatchButton taskId={task.id} className="flex-1" />
                                        <VoteButton taskId={task.id} className="flex-1" />
                                    </div>
                                </div>
                            )}

                            {/* Checklist Progress */}
                            {totalItems > 0 && (
                                <div>
                                    <p className="text-xs text-text-muted font-medium mb-2">PROGRESS</p>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full transition-all"
                                                style={{ width: `${checklistProgress}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-white">{checklistProgress}%</span>
                                    </div>
                                    <p className="text-xs text-text-muted">{completedItems}/{totalItems} items</p>
                                </div>
                            )}

                            {/* Actions */}
                            {isEditing && (
                                <div className="pt-4 border-t border-border space-y-2">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                                        className="w-full px-4 py-2 gradient-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {(createTaskMutation.isPending || updateTaskMutation.isPending) && (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        )}
                                        {task ? 'Simpan' : 'Buat Task'}
                                    </button>
                                    {task && (
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="w-full px-4 py-2 bg-surface text-white rounded-lg text-sm"
                                        >
                                            Batal
                                        </button>
                                    )}
                                </div>
                            )}

                            {task && canEdit && !isEditing && (
                                <div className="pt-4 border-t border-border">
                                    <p className="text-xs text-text-muted font-medium mb-3">ACTIONS</p>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-light rounded-lg text-white text-sm transition-colors mb-2"
                                    >
                                        Edit Card
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeleteConfirm({
                                                show: true,
                                                type: 'task',
                                                id: task.id,
                                                title: 'Delete Task'
                                            });
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 text-sm transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Image Preview Lightbox */}
            {previewImage && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <div className="max-w-4xl max-h-[80vh] flex flex-col items-center">
                        <img
                            src={previewImage.url}
                            alt={previewImage.name}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <p className="text-white text-sm mt-4">{previewImage.name}</p>
                        <a
                            href={previewImage.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </a>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, type: null, id: null, title: '' })}
                onConfirm={() => {
                    if (deleteConfirm.type === 'comment') {
                        deleteCommentMutation.mutate(deleteConfirm.id);
                    } else if (deleteConfirm.type === 'task') {
                        deleteTaskMutation.mutate();
                    }
                    setDeleteConfirm({ show: false, type: null, id: null, title: '' });
                }}
                title={deleteConfirm.title}
                message={
                    deleteConfirm.type === 'comment'
                        ? 'Are you sure you want to delete this comment? This action cannot be undone.'
                        : 'Are you sure you want to delete this task? All comments, attachments, and checklists will be permanently removed.'
                }
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}

function ChecklistSection({ checklist, onToggleItem, onDeleteItem, onDeleteChecklist, onAddItem, onUpdateChecklist, onUpdateItem, newItemContent, setNewItemContent }) {
    const [showAddItem, setShowAddItem] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(checklist.title);
    const [editingItemId, setEditingItemId] = useState(null);
    const [editItemContent, setEditItemContent] = useState('');

    const progress = checklist.total_items > 0
        ? Math.round((checklist.completed_items / checklist.total_items) * 100)
        : 0;

    const handleAddItem = () => {
        if (newItemContent.trim()) {
            onAddItem(newItemContent);
            setNewItemContent('');
            setShowAddItem(false);
        }
    };

    const handleSaveTitle = () => {
        if (titleValue.trim() && titleValue !== checklist.title) {
            onUpdateChecklist(titleValue.trim());
        }
        setEditingTitle(false);
    };

    const handleStartEditItem = (item) => {
        setEditingItemId(item.id);
        setEditItemContent(item.content);
    };

    const handleSaveItem = (itemId) => {
        if (editItemContent.trim()) {
            onUpdateItem(itemId, { content: editItemContent.trim() });
        }
        setEditingItemId(null);
        setEditItemContent('');
    };

    const handleProgressChange = (itemId, newProgress) => {
        onUpdateItem(itemId, { progress: newProgress });
    };

    return (
        <div className="bg-surface/30 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                    <CheckSquare className="w-4 h-4 text-text-muted" />
                    {editingTitle ? (
                        <input
                            type="text"
                            value={titleValue}
                            onChange={(e) => setTitleValue(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle();
                                if (e.key === 'Escape') {
                                    setTitleValue(checklist.title);
                                    setEditingTitle(false);
                                }
                            }}
                            className="flex-1 px-2 py-1 bg-surface border border-primary rounded text-white text-sm focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <h4
                            className="font-medium text-white cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setEditingTitle(true)}
                            title="Click to edit"
                        >
                            {checklist.title}
                        </h4>
                    )}
                </div>
                <button
                    onClick={onDeleteChecklist}
                    className="text-text-muted hover:text-red-400 text-xs"
                >
                    Delete
                </button>
            </div>

            {/* Progress */}
            {checklist.total_items > 0 && (
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-text-muted w-8">{progress}%</span>
                    <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                progress === 100 ? "bg-green-500" : "bg-primary"
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Items */}
            <div className="space-y-2 mb-3">
                {checklist.items?.map((item) => {
                    const isCompleted = item.is_completed === true || item.is_completed === 1 || item.is_completed === '1';
                    const itemProgress = parseInt(item.progress) || 0;

                    return (
                        <div key={item.id} className="group bg-surface/50 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onToggleItem(item.id)}
                                    className={cn(
                                        "w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                                        isCompleted
                                            ? "bg-green-500 border-green-500"
                                            : "border-border hover:border-primary"
                                    )}
                                >
                                    {isCompleted && <Check className="w-3 h-3 text-white" />}
                                </button>

                                {editingItemId === item.id ? (
                                    <input
                                        type="text"
                                        value={editItemContent}
                                        onChange={(e) => setEditItemContent(e.target.value)}
                                        onBlur={() => handleSaveItem(item.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveItem(item.id);
                                            if (e.key === 'Escape') {
                                                setEditingItemId(null);
                                                setEditItemContent('');
                                            }
                                        }}
                                        className="flex-1 px-2 py-1 bg-background border border-primary rounded text-white text-sm focus:outline-none"
                                        autoFocus
                                    />
                                ) : (
                                    <span
                                        className={cn(
                                            "flex-1 text-sm cursor-pointer hover:text-primary transition-colors",
                                            isCompleted ? "text-text-muted line-through" : "text-white"
                                        )}
                                        onClick={() => handleStartEditItem(item)}
                                        title="Click to edit"
                                    >
                                        {item.content}
                                    </span>
                                )}

                                <button
                                    onClick={() => onDeleteItem(item.id)}
                                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Progress Slider */}
                            <div className="flex items-center gap-2 mt-2 pl-6">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="10"
                                    value={itemProgress}
                                    onChange={(e) => handleProgressChange(item.id, parseInt(e.target.value))}
                                    className="flex-1 h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-primary"
                                    style={{
                                        background: `linear-gradient(to right, ${itemProgress >= 100 ? '#22c55e' : '#6366f1'} ${itemProgress}%, #1e1e2e ${itemProgress}%)`
                                    }}
                                />
                                <span className={cn(
                                    "text-xs w-10 text-right font-medium",
                                    itemProgress >= 100 ? "text-green-400" : "text-text-muted"
                                )}>
                                    {itemProgress}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Item */}
            {showAddItem ? (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newItemContent}
                        onChange={(e) => setNewItemContent(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                        placeholder="Tambah item..."
                        className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                        autoFocus
                    />
                    <button
                        onClick={handleAddItem}
                        className="px-3 py-2 bg-primary text-white rounded-lg text-sm"
                    >
                        Add
                    </button>
                    <button
                        onClick={() => { setShowAddItem(false); setNewItemContent(''); }}
                        className="px-3 py-2 text-text-muted text-sm"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowAddItem(true)}
                    className="flex items-center gap-1 text-text-muted hover:text-white text-sm py-1"
                >
                    <Plus className="w-3 h-3" />
                    Add an item
                </button>
            )}
        </div>
    );
}
