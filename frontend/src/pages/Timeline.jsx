import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { projectsApi, tasksApi } from '../lib/api';
import {
    ArrowLeft,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/project-gemini/project-03/backend'}/api`;

export default function Timeline() {
    const { projectId } = useParams();
    const [viewStart, setViewStart] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });

    // Get project info
    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectsApi.getById(projectId),
    });
    const project = projectData?.data?.data;

    // Get all tasks for the project
    const { data: tasksData, isLoading } = useQuery({
        queryKey: ['timeline-tasks', projectId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/tasks/list.php?project_id=${projectId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
            });
            return res.json();
        },
    });
    const tasks = tasksData?.data || [];

    // Filter tasks with dates
    const tasksWithDates = tasks.filter(t => t.start_date || t.due_date);

    // Generate days for the view (4 weeks)
    const days = [];
    const viewEnd = new Date(viewStart);
    viewEnd.setDate(viewEnd.getDate() + 28);

    let currentDay = new Date(viewStart);
    while (currentDay < viewEnd) {
        days.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
    }

    // Navigate months
    const prevMonth = () => {
        const d = new Date(viewStart);
        d.setDate(d.getDate() - 28);
        setViewStart(d);
    };

    const nextMonth = () => {
        const d = new Date(viewStart);
        d.setDate(d.getDate() + 28);
        setViewStart(d);
    };

    // Calculate task position and width
    const getTaskStyle = (task) => {
        const start = task.start_date ? new Date(task.start_date) : new Date(task.due_date);
        const end = task.due_date ? new Date(task.due_date) : new Date(task.start_date);

        const viewStartTime = viewStart.getTime();
        const dayWidth = 100 / 28; // percentage per day

        const startOffset = Math.max(0, (start.getTime() - viewStartTime) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1);

        const left = startOffset * dayWidth;
        const width = duration * dayWidth;

        // Don't show if completely outside view
        if (startOffset >= 28 || startOffset + duration < 0) {
            return null;
        }

        return {
            left: `${Math.max(0, left)}%`,
            width: `${Math.min(100 - Math.max(0, left), width)}%`,
        };
    };

    const typeColors = {
        epic: 'bg-purple-500',
        story: 'bg-green-500',
        task: 'bg-blue-500',
        bug: 'bg-red-500',
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/projects"
                        className="p-2 hover:bg-surface rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-text-muted" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white">{project?.name}</h1>
                        <p className="text-sm text-text-muted">Timeline View</p>
                    </div>
                </div>

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
                        className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-surface-light transition-colors"
                    >
                        📦 Backlog
                    </Link>
                    <Link
                        to={`/projects/${projectId}/timeline`}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white"
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
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-surface rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-white font-medium min-w-[200px] text-center">
                        {viewStart.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-surface rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    {Object.entries(typeColors).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded", color)} />
                            <span className="text-text-muted capitalize">{type}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Timeline Grid */}
            <div className="glass rounded-xl overflow-hidden">
                {/* Days Header */}
                <div className="flex border-b border-border">
                    <div className="w-48 flex-shrink-0 p-3 border-r border-border bg-surface/50">
                        <span className="text-sm font-medium text-text-muted">Task</span>
                    </div>
                    <div className="flex-1 flex">
                        {days.map((day, i) => {
                            const isToday = day.toDateString() === new Date().toDateString();
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex-1 p-2 text-center border-r border-border last:border-r-0 min-w-[36px]",
                                        isWeekend && "bg-surface/30",
                                        isToday && "bg-primary/10"
                                    )}
                                >
                                    <div className="text-xs text-text-muted">
                                        {day.toLocaleDateString('id-ID', { weekday: 'short' })}
                                    </div>
                                    <div className={cn(
                                        "text-sm font-medium",
                                        isToday ? "text-primary" : "text-white"
                                    )}>
                                        {day.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Tasks */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : tasksWithDates.length === 0 ? (
                    <div className="text-center py-12 text-text-muted">
                        No tasks with dates found
                    </div>
                ) : (
                    tasksWithDates.map((task) => {
                        const style = getTaskStyle(task);
                        if (!style) return null;

                        return (
                            <div key={task.id} className="flex border-b border-border last:border-b-0 hover:bg-surface/30">
                                <div className="w-48 flex-shrink-0 p-3 border-r border-border">
                                    <p className="text-sm text-white truncate" title={task.title}>
                                        {task.title}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                        {task.column_name}
                                    </p>
                                </div>
                                <div className="flex-1 relative py-3 px-2">
                                    <div
                                        className={cn(
                                            "absolute top-1/2 -translate-y-1/2 h-6 rounded-full",
                                            typeColors[task.type] || typeColors.task,
                                            "opacity-80 hover:opacity-100 cursor-pointer transition-opacity"
                                        )}
                                        style={style}
                                        title={`${task.title}\n${formatDate(task.start_date)} - ${formatDate(task.due_date)}`}
                                    >
                                        <span className="px-2 text-xs text-white font-medium truncate block leading-6">
                                            {task.title}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
