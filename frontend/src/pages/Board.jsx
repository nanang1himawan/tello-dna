import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { boardsApi, tasksApi, usersApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';
import BoardSettingsModal from '../components/BoardSettingsModal';
import QuickFilters, { filterTasks } from '../components/QuickFilters';
import { LabelsDisplay } from '../components/LabelsManager';
import {
    ArrowLeft,
    Plus,
    Calendar,
    AlertCircle,
    Loader2,
    CheckSquare,
    Settings,
    GripVertical
} from 'lucide-react';
import { cn, formatDate, getSeverityColor, getInitials } from '../lib/utils';

export default function Board() {
    const { projectId, boardId } = useParams();
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedColumn, setSelectedColumn] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [filters, setFilters] = useState({});
    const [showAddColumn, setShowAddColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');

    // Get users for filters (using basic list that works for all users)
    const { data: usersData } = useQuery({
        queryKey: ['users-basic'],
        queryFn: () => usersApi.getBasicList(),
    });
    const users = usersData?.data?.data?.users || [];

    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/project-gemini/project-03/backend'}/api/projects/show.php?id=${projectId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        }).then(res => res.json()),
        enabled: !!projectId && !boardId,
    });

    const actualBoardId = boardId || projectData?.data?.boards?.[0]?.id;

    const { data, isLoading, error } = useQuery({
        queryKey: ['board', actualBoardId],
        queryFn: () => boardsApi.getById(actualBoardId),
        enabled: !!actualBoardId,
    });

    const board = data?.data?.data;

    const moveMutation = useMutation({
        mutationFn: ({ taskId, columnId, position }) => tasksApi.move(taskId, { column_id: columnId, position }),
        onSuccess: () => {
            queryClient.invalidateQueries(['board', actualBoardId]);
        },
    });

    // Column reorder mutation
    const reorderColumnsMutation = useMutation({
        mutationFn: ({ boardId, columnIds }) => boardsApi.reorderColumns(boardId, columnIds),
        onSuccess: () => {
            queryClient.invalidateQueries(['board', actualBoardId]);
        },
    });

    // Add column mutation
    const addColumnMutation = useMutation({
        mutationFn: ({ boardId, name }) => boardsApi.addColumn(boardId, name),
        onSuccess: () => {
            queryClient.invalidateQueries(['board', actualBoardId]);
            setShowAddColumn(false);
            setNewColumnName('');
        },
    });

    const handleAddColumn = () => {
        if (!newColumnName.trim()) return;
        addColumnMutation.mutate({ boardId: actualBoardId, name: newColumnName.trim() });
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const { source, destination, draggableId, type } = result;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Handle column reordering
        if (type === 'COLUMN') {
            const columns = [...board.columns];
            const [movedColumn] = columns.splice(source.index, 1);
            columns.splice(destination.index, 0, movedColumn);

            const columnIds = columns.map(col => col.id);
            reorderColumnsMutation.mutate({ boardId: actualBoardId, columnIds });
            return;
        }

        // Handle task moving
        const taskId = draggableId.replace('task-', '');
        const newColumnId = destination.droppableId.replace('column-', '');
        const newPosition = destination.index;

        moveMutation.mutate({ taskId, columnId: newColumnId, position: newPosition });
    };

    const openCreateTask = (columnId) => {
        setSelectedColumn(columnId);
        setEditingTask(null);
        setShowTaskModal(true);
    };

    const openEditTask = (task) => {
        setEditingTask(task);
        setSelectedColumn(task.column_id);
        setShowTaskModal(true);
    };

    if (isLoading || !actualBoardId) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-12 text-red-400">Error loading board</div>;
    }

    return (
        <div className="h-full flex flex-col animate-fadeIn">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/projects" className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white">{board?.project_name}</h1>
                        <p className="text-sm text-text-muted">{board?.name}</p>
                    </div>
                </div>
                {/* View Toggle */}
                <div className="flex items-center gap-2 bg-surface rounded-xl p-1">
                    <Link
                        to={`/projects/${projectId}`}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white"
                    >
                        📋 Board
                    </Link>
                    <Link
                        to={`/projects/${projectId}/backlog`}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-surface-light transition-colors"
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

                {/* Filters & Settings */}
                <div className="flex items-center gap-2">
                    <QuickFilters
                        users={users}
                        filters={filters}
                        onFilterChange={setFilters}
                    />
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 bg-surface text-text-muted hover:text-white rounded-lg transition-colors"
                        title="Board Settings"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="flex gap-4 h-full min-w-max"
                            >
                                {board?.columns?.map((column, columnIndex) => (
                                    <Draggable key={column.id} draggableId={`column-drag-${column.id}`} index={columnIndex}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={cn(
                                                    "w-80 flex-shrink-0 flex flex-col transition-all",
                                                    snapshot.isDragging && "opacity-90 shadow-2xl"
                                                )}
                                            >
                                                <div className="flex items-center justify-between mb-3 px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="p-1 cursor-grab text-text-muted hover:text-white rounded hover:bg-surface transition-colors"
                                                            title="Drag untuk memindahkan kolom"
                                                        >
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
                                                        <h3 className="font-medium text-white">{column.name}</h3>
                                                        <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">
                                                            {column.tasks?.length || 0}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => openCreateTask(column.id)} className="p-1 hover:bg-surface rounded transition-colors text-text-muted hover:text-white">
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <Droppable droppableId={`column-${column.id}`} type="TASK">
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.droppableProps}
                                                            className={cn(
                                                                "flex-1 space-y-3 p-2 rounded-xl transition-colors min-h-[200px]",
                                                                snapshot.isDraggingOver ? "bg-primary/10" : "bg-surface/30"
                                                            )}
                                                        >
                                                            {filterTasks(column.tasks || [], filters).map((task, index) => (
                                                                <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}>
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            {...provided.dragHandleProps}
                                                                            onClick={() => openEditTask(task)}
                                                                            className={cn(
                                                                                "glass rounded-xl p-4 cursor-pointer transition-all",
                                                                                snapshot.isDragging ? "shadow-2xl rotate-2" : "hover:bg-surface"
                                                                            )}
                                                                        >
                                                                            {/* Type & Severity Badges */}
                                                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                                <span className={cn(
                                                                                    "text-xs px-2 py-0.5 rounded font-medium",
                                                                                    task.type === 'epic' && "bg-purple-500/20 text-purple-400",
                                                                                    task.type === 'story' && "bg-green-500/20 text-green-400",
                                                                                    task.type === 'task' && "bg-blue-500/20 text-blue-400",
                                                                                    task.type === 'bug' && "bg-red-500/20 text-red-400",
                                                                                    !task.type && "bg-blue-500/20 text-blue-400"
                                                                                )}>
                                                                                    {task.type === 'epic' && '⚡'}
                                                                                    {task.type === 'story' && '📖'}
                                                                                    {task.type === 'bug' && '🐛'}
                                                                                    {(task.type === 'task' || !task.type) && '✅'}
                                                                                    {' '}{task.type || 'task'}
                                                                                </span>
                                                                                {task.severity !== 'minor' && (
                                                                                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border", getSeverityColor(task.severity))}>
                                                                                        <AlertCircle className="w-3 h-3" />
                                                                                        {task.severity}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <h4 className="font-medium text-white mb-2 line-clamp-2">{task.title}</h4>
                                                                            {task.labels?.length > 0 && (
                                                                                <div className="mb-2">
                                                                                    <LabelsDisplay labels={task.labels} size="sm" />
                                                                                </div>
                                                                            )}
                                                                            {task.description && <p className="text-sm text-text-muted mb-3 line-clamp-2">{task.description}</p>}
                                                                            <div className="flex items-center justify-between text-xs text-text-muted">
                                                                                <div className="flex items-center gap-3">
                                                                                    {task.due_date && (
                                                                                        <span className={cn("flex items-center gap-1", new Date(task.due_date) < new Date() && "text-red-400")}>
                                                                                            <Calendar className="w-3 h-3" />
                                                                                            {formatDate(task.due_date)}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {task.assignee_name && (
                                                                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium" title={task.assignee_name}>
                                                                                        {getInitials(task.assignee_name)}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}

                                                            {/* Add Card Button at Bottom */}
                                                            <button
                                                                onClick={() => openCreateTask(column.id)}
                                                                className="w-full mt-2 py-2 px-3 rounded-lg text-sm text-text-muted hover:text-white hover:bg-surface/50 transition-colors flex items-center gap-2 border border-dashed border-border/50 hover:border-primary/50"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                Add a card
                                                            </button>
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}

                                {/* Add Column Button */}
                                <div className="w-80 flex-shrink-0">
                                    {showAddColumn ? (
                                        <div className="bg-surface rounded-xl p-3 space-y-2">
                                            <input
                                                type="text"
                                                value={newColumnName}
                                                onChange={(e) => setNewColumnName(e.target.value)}
                                                placeholder="Nama kolom baru..."
                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleAddColumn();
                                                    if (e.key === 'Escape') {
                                                        setShowAddColumn(false);
                                                        setNewColumnName('');
                                                    }
                                                }}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleAddColumn}
                                                    disabled={!newColumnName.trim() || addColumnMutation.isPending}
                                                    className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    {addColumnMutation.isPending ? 'Adding...' : 'Add'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowAddColumn(false);
                                                        setNewColumnName('');
                                                    }}
                                                    className="py-2 px-3 bg-surface-light hover:bg-surface text-text-muted hover:text-white rounded-lg text-sm transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowAddColumn(true)}
                                            className="w-full py-3 px-4 bg-surface/50 hover:bg-surface border border-dashed border-border hover:border-primary/50 rounded-xl text-sm text-text-muted hover:text-white transition-all flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Column
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            {showTaskModal && (
                <TaskModal
                    task={editingTask}
                    columnId={selectedColumn}
                    boardId={actualBoardId}
                    currentUser={currentUser}
                    onClose={() => {
                        setShowTaskModal(false);
                        setEditingTask(null);
                        setSelectedColumn(null);
                    }}
                />
            )}

            {showSettings && board && (
                <BoardSettingsModal
                    board={board}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    );
}
