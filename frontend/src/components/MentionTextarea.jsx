import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { getInitials } from '../lib/utils';

const MentionTextarea = forwardRef(({
    value,
    onChange,
    users = [],
    placeholder = '',
    rows = 3,
    className = '',
    ...props
}, ref) => {
    const textareaRef = useRef(null);
    const dropdownRef = useRef(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartPos, setMentionStartPos] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    // Forward ref so parent can access textarea methods (selectionStart, focus, etc.)
    useImperativeHandle(ref, () => textareaRef.current);

    // Filter users based on mention query
    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(mentionQuery.toLowerCase())
    ).slice(0, 8);

    // Calculate dropdown position based on cursor
    const calculateDropdownPosition = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Create a mirror div to measure cursor position
        const mirror = document.createElement('div');
        const computed = window.getComputedStyle(textarea);

        // Copy styles
        const stylesToCopy = [
            'font-family', 'font-size', 'font-weight', 'line-height',
            'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
            'letter-spacing', 'word-spacing', 'text-indent', 'white-space', 'word-wrap',
            'overflow-wrap', 'width', 'box-sizing'
        ];

        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordWrap = 'break-word';

        stylesToCopy.forEach(prop => {
            mirror.style[prop] = computed[prop];
        });

        // Get text up to cursor
        const textBeforeCursor = value.substring(0, textarea.selectionStart);
        mirror.textContent = textBeforeCursor;

        // Add a span at end to get position
        const marker = document.createElement('span');
        marker.textContent = '|';
        mirror.appendChild(marker);

        document.body.appendChild(mirror);

        const textareaRect = textarea.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();

        // Calculate position relative to textarea
        const relativeTop = markerRect.top - mirrorRect.top - textarea.scrollTop;
        const relativeLeft = markerRect.left - mirrorRect.left;

        document.body.removeChild(mirror);

        setDropdownPosition({
            top: Math.min(relativeTop + 24, textarea.offsetHeight),
            left: Math.min(relativeLeft, textarea.offsetWidth - 250)
        });
    }, [value]);

    // Detect @mention trigger
    const handleChange = (e) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;

        onChange(newValue);

        // Check for @ trigger
        const textBeforeCursor = newValue.substring(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);

        if (atMatch) {
            const atPos = cursorPos - atMatch[0].length;
            // Check that @ is at start of text or preceded by whitespace/newline
            if (atPos === 0 || /[\s\n]/.test(newValue[atPos - 1])) {
                setMentionQuery(atMatch[1]);
                setMentionStartPos(atPos);
                setShowSuggestions(true);
                setSelectedIndex(0);
                // Calculate position after state update
                setTimeout(calculateDropdownPosition, 0);
                return;
            }
        }

        setShowSuggestions(false);
        setMentionQuery('');
        setMentionStartPos(-1);
    };

    // Handle keyboard navigation in dropdown
    const handleKeyDown = (e) => {
        if (!showSuggestions || filteredUsers.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredUsers.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
                break;
            case 'Enter':
                e.preventDefault();
                insertMention(filteredUsers[selectedIndex]);
                break;
            case 'Tab':
                e.preventDefault();
                insertMention(filteredUsers[selectedIndex]);
                break;
            case 'Escape':
                e.preventDefault();
                setShowSuggestions(false);
                break;
        }
    };

    // Insert selected mention into textarea
    const insertMention = (user) => {
        if (!user || mentionStartPos === -1) return;

        const textarea = textareaRef.current;
        const beforeMention = value.substring(0, mentionStartPos);
        const afterMention = value.substring(textarea.selectionStart);
        const mentionText = `@[${user.name}] `;

        const newValue = beforeMention + mentionText + afterMention;
        onChange(newValue);

        setShowSuggestions(false);
        setMentionQuery('');
        setMentionStartPos(-1);

        // Restore focus and set cursor after mention
        const newCursorPos = mentionStartPos + mentionText.length;
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                textareaRef.current && !textareaRef.current.contains(e.target)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll selected item into view
    useEffect(() => {
        if (!showSuggestions || !dropdownRef.current) return;
        const items = dropdownRef.current.querySelectorAll('[data-mention-item]');
        if (items[selectedIndex]) {
            items[selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex, showSuggestions]);

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                className={className}
                {...props}
            />

            {/* Mention Suggestions Dropdown */}
            {showSuggestions && filteredUsers.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-[100] w-64 max-h-52 overflow-y-auto bg-[#1e1e2e] border border-[#2a2a3e] rounded-xl shadow-2xl animate-fadeIn"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${Math.max(0, dropdownPosition.left)}px`,
                    }}
                >
                    <div className="p-1.5">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider px-2 py-1 font-medium">
                            Members
                        </p>
                        {filteredUsers.map((user, index) => (
                            <button
                                key={user.id}
                                data-mention-item
                                onClick={() => insertMention(user)}
                                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${index === selectedIndex
                                    ? 'bg-[#6366f1]/20 text-white'
                                    : 'text-gray-300 hover:bg-[#2a2a3e]'
                                    }`}
                            >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${index === selectedIndex
                                    ? 'bg-[#6366f1]/30 text-[#818cf8]'
                                    : 'bg-[#2a2a3e] text-gray-400'
                                    }`}>
                                    {getInitials(user.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                    {user.email && (
                                        <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                                    )}
                                </div>
                                {user.role && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${user.role === 'admin'
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : user.role === 'manager'
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-green-500/20 text-green-400'
                                        }`}>
                                        {user.role}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* No results message */}
            {showSuggestions && mentionQuery.length > 0 && filteredUsers.length === 0 && (
                <div
                    className="absolute z-[100] w-64 bg-[#1e1e2e] border border-[#2a2a3e] rounded-xl shadow-2xl p-4 text-center"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${Math.max(0, dropdownPosition.left)}px`,
                    }}
                >
                    <p className="text-gray-500 text-sm">No members found for "{mentionQuery}"</p>
                </div>
            )}
        </div>
    );
});

MentionTextarea.displayName = 'MentionTextarea';

export default MentionTextarea;
