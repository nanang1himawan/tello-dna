import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { tasksApi, projectsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Filter,
    Loader2,
    X,
    AlertCircle,
    User,
    Eye
} from 'lucide-react';
import { cn, getSeverityColor, getInitials, formatDate } from '../lib/utils';

export default function Calendar() {
    const queryClient = useQueryClient();
    const calendarRef = useRef(null);
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedProject, setSelectedProject] = useState('');
    const [myTasksOnly, setMyTasksOnly] = useState(false);
    const [viewMode, setViewMode] = useState('plan'); // 'plan' or 'actual'
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Fetch projects for filter
    const { data: projectsData } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll(),
    });
    const projects = projectsData?.data?.data || [];

    // Fetch calendar events
    const { data: eventsData, isLoading } = useQuery({
        queryKey: ['calendar-events', currentDate.toISOString().slice(0, 7), selectedProject, myTasksOnly, viewMode],
        queryFn: () => {
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            const params = new URLSearchParams({
                start: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
                end: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
                my_tasks: myTasksOnly.toString(),
                view: viewMode,
            });
            if (selectedProject) params.append('project_id', selectedProject);

            return fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8080/project-gemini/project-03/backend'}/api/tasks/calendar.php?${params}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
            ).then(res => res.json());
        },
    });

    const events = eventsData?.data || [];

    // Update due date mutation
    const updateDueDateMutation = useMutation({
        mutationFn: ({ taskId, startDate, dueDate }) => tasksApi.update(taskId, { start_date: startDate, due_date: dueDate }),
        onSuccess: () => {
            queryClient.invalidateQueries(['calendar-events']);
        },
    });

    const handleEventDrop = (info) => {
        const taskId = info.event.extendedProps.task_id;
        const newStartDate = info.event.start.toISOString().slice(0, 10);
        // Calculate new due date based on original duration
        const origStart = info.event.extendedProps.start_date;
        const origDue = info.event.extendedProps.due_date;

        if (origStart && origDue) {
            const duration = (new Date(origDue) - new Date(origStart)) / (1000 * 60 * 60 * 24);
            const newDue = new Date(info.event.start);
            newDue.setDate(newDue.getDate() + duration);
            updateDueDateMutation.mutate({
                taskId,
                startDate: newStartDate,
                dueDate: newDue.toISOString().slice(0, 10)
            });
        } else {
            updateDueDateMutation.mutate({ taskId, startDate: newStartDate, dueDate: newStartDate });
        }
    };

    const handleEventClick = (info) => {
        setSelectedEvent({
            ...info.event.extendedProps,
            title: info.event.extendedProps.original_title || info.event.title,
            start: info.event.start,
            end: info.event.end,
        });
    };

    const goToToday = () => {
        const calendarApi = calendarRef.current?.getApi();
        calendarApi?.today();
        setCurrentDate(new Date());
    };

    const goToPrev = () => {
        const calendarApi = calendarRef.current?.getApi();
        calendarApi?.prev();
        setCurrentDate(calendarApi?.getDate());
    };

    const goToNext = () => {
        const calendarApi = calendarRef.current?.getApi();
        calendarApi?.next();
        setCurrentDate(calendarApi?.getDate());
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-primary" />
                        Calendar
                    </h1>
                    <p className="text-text-muted">Lihat jadwal task berdasarkan tanggal</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <Filter className="w-4 h-4 text-text-muted" />

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-surface rounded-xl overflow-hidden border border-border">
                        <button
                            onClick={() => setViewMode('plan')}
                            className={cn(
                                "px-3 py-2 text-sm font-medium transition-colors",
                                viewMode === 'plan' ? "bg-primary text-white" : "text-text-muted hover:text-white"
                            )}
                        >
                            📋 Plan
                        </button>
                        <button
                            onClick={() => setViewMode('actual')}
                            className={cn(
                                "px-3 py-2 text-sm font-medium transition-colors",
                                viewMode === 'actual' ? "bg-primary text-white" : "text-text-muted hover:text-white"
                            )}
                        >
                            ✅ Actual
                        </button>
                    </div>

                    {/* Task Filter */}
                    <select
                        value={myTasksOnly ? 'my' : 'all'}
                        onChange={(e) => setMyTasksOnly(e.target.value === 'my')}
                        className="px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                    >
                        <option value="all">📋 Semua Task</option>
                        <option value="my">🎯 Task Saya</option>
                    </select>

                    {/* Project Filter */}
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                    >
                        <option value="">Semua Project</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Calendar Navigation */}
            <div className="glass rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPrev}
                        className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted hover:text-white"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted hover:text-white"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToToday}
                        className="px-3 py-1 bg-surface hover:bg-surface-light rounded-lg text-sm font-medium text-white transition-colors"
                    >
                        Hari Ini
                    </button>
                </div>

                <h2 className="text-lg font-semibold text-white">
                    {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </h2>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-red-500"></span> Critical
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-amber-500"></span> Major
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded bg-blue-500"></span> Minor
                        </span>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-primary">
                <Eye className="w-4 h-4" />
                Menampilkan tanggal <strong>{viewMode === 'plan' ? 'RENCANA (Start - Due Date)' : 'AKTUAL (Real Start - End)'}</strong>
                <span className="text-text-muted">• {events.length} task</span>
            </div>

            {/* Calendar */}
            <div className="glass rounded-xl p-4 calendar-container">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={false}
                        events={events}
                        editable={viewMode === 'plan'} // Only allow drag in plan view
                        droppable={viewMode === 'plan'}
                        eventDrop={handleEventDrop}
                        eventClick={handleEventClick}
                        height="auto"
                        locale="id"
                        firstDay={1}
                        eventDisplay="block"
                        dayMaxEventRows={3}
                        moreLinkContent={(args) => `+${args.num} lainnya`}
                    />
                )}
            </div>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
        </div>
    );
}

function EventDetailModal({ event, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl w-full max-w-md animate-fadeIn max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-bold text-white">Detail Task</h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Severity */}
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border capitalize",
                            getSeverityColor(event.severity)
                        )}>
                            <AlertCircle className="w-3 h-3" />
                            {event.severity}
                        </span>
                        {event.status_actual > 0 && (
                            <span className="text-xs text-primary font-medium">
                                {event.status_actual}% Complete
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-white">{event.title}</h3>

                    {/* Description */}
                    {event.description && (
                        <p className="text-text-muted">{event.description}</p>
                    )}

                    {/* Progress Bar */}
                    {event.status_actual > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-text-muted">Progress Aktual</span>
                                <span className="text-primary font-medium">{event.status_actual}%</span>
                            </div>
                            <div className="h-2 bg-surface rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${event.status_actual}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Meta Info */}
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between py-2 border-b border-border">
                            <span className="text-text-muted">Project</span>
                            <span className="text-white font-medium">{event.project_name}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-border">
                            <span className="text-text-muted">Board</span>
                            <span className="text-white font-medium">{event.board_name}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-border">
                            <span className="text-text-muted">Column</span>
                            <span className="text-white font-medium">{event.column_name}</span>
                        </div>

                        {/* Plan Dates */}
                        <div className="py-2 border-b border-border">
                            <span className="text-text-muted block mb-1">📋 Tanggal Rencana</span>
                            <div className="flex items-center justify-between text-white">
                                <span>{event.start_date ? formatDate(event.start_date) : '-'}</span>
                                <span className="text-text-muted">→</span>
                                <span>{event.due_date ? formatDate(event.due_date) : '-'}</span>
                            </div>
                        </div>

                        {/* Actual Dates */}
                        <div className="py-2 border-b border-border">
                            <span className="text-text-muted block mb-1">✅ Tanggal Aktual</span>
                            <div className="flex items-center justify-between text-white">
                                <span>{event.actual_start_date ? formatDate(event.actual_start_date) : '-'}</span>
                                <span className="text-text-muted">→</span>
                                <span>{event.actual_end_date ? formatDate(event.actual_end_date) : '-'}</span>
                            </div>
                        </div>

                        {event.assignee_name && (
                            <div className="flex items-center justify-between py-2">
                                <span className="text-text-muted">Assignee</span>
                                <span className="text-white font-medium flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                                        {getInitials(event.assignee_name)}
                                    </span>
                                    {event.assignee_name}
                                </span>
                            </div>
                        )}
                    </div>

                    <a
                        href={`/projects/${event.project_id}`}
                        className="block w-full py-2 px-4 gradient-primary text-white text-center font-medium rounded-xl btn-hover"
                    >
                        Buka di Kanban
                    </a>
                </div>
            </div>
        </div>
    );
}
