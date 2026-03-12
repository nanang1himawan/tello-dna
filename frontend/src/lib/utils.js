import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatDateTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function getSeverityColor(severity) {
    switch (severity) {
        case 'critical':
            return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'major':
            return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        case 'minor':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        default:
            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
}

export function getRoleBadgeColor(role) {
    switch (role) {
        case 'admin':
            return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        case 'manager':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'staff':
            return 'bg-green-500/20 text-green-400 border-green-500/30';
        default:
            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
}

export function getTimeAgo(date) {
    if (!date) return '';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Added just now';
    if (diffMins < 60) return `Added ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `Added ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `Added ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return `Added ${formatDate(date)}`;
}

export function formatMarkdown(text) {
    if (!text) return '';

    // Convert markdown to HTML
    let formatted = text
        // @Mentions: @[Username] bracket-delimited format
        .replace(/@\[([^\]]+)\]/g,
            '<span class="mention-badge" style="background:rgba(99,102,241,0.2);color:#818cf8;padding:1px 6px;border-radius:4px;font-weight:500;font-size:0.85em;white-space:nowrap;">@$1</span>')
        // Bold: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic: _text_ or *text*
        .replace(/\b_(.+?)_\b/g, '<em>$1</em>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Links: [text](url)
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
        // Line breaks
        .replace(/\n/g, '<br/>');

    return formatted;
}
