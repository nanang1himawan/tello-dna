import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardsApi } from '../lib/api';
import {
    X,
    Settings,
    Palette,
    Image,
    Loader2,
    Check
} from 'lucide-react';
import { cn } from '../lib/utils';

const PRESET_COLORS = [
    { name: 'Blue', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { name: 'Green', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { name: 'Orange', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { name: 'Purple', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { name: 'Dark', value: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
    { name: 'Sunset', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { name: 'Ocean', value: 'linear-gradient(135deg, #0052D4 0%, #65C7F7 50%, #9CECFB 100%)' },
    { name: 'Forest', value: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)' },
];

const PRESET_IMAGES = [
    { name: 'Mountains', value: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
    { name: 'Ocean', value: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80' },
    { name: 'Forest', value: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80' },
    { name: 'City', value: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80' },
    { name: 'Stars', value: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80' },
    { name: 'Abstract', value: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80' },
];

export default function BoardSettingsModal({ board, onClose }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('background');
    const [backgroundType, setBackgroundType] = useState(board?.background_type || 'color');
    const [backgroundValue, setBackgroundValue] = useState(board?.background_value || PRESET_COLORS[0].value);
    const [boardName, setBoardName] = useState(board?.name || '');

    const updateMutation = useMutation({
        mutationFn: (data) => boardsApi.update(board.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['board', board.id]);
            queryClient.invalidateQueries(['project']);
            onClose();
        },
    });

    const handleSave = () => {
        updateMutation.mutate({
            name: boardName,
            background_type: backgroundType,
            background_value: backgroundValue,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="glass rounded-2xl w-full max-w-2xl animate-fadeIn max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        Board Settings
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg">
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border px-6">
                    <button
                        onClick={() => setActiveTab('background')}
                        className={cn(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'background'
                                ? "text-primary border-primary"
                                : "text-text-muted border-transparent hover:text-white"
                        )}
                    >
                        <Palette className="w-4 h-4 inline mr-2" />
                        Background
                    </button>
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'general'
                                ? "text-primary border-primary"
                                : "text-text-muted border-transparent hover:text-white"
                        )}
                    >
                        <Settings className="w-4 h-4 inline mr-2" />
                        General
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'background' && (
                        <div className="space-y-6">
                            {/* Type Toggle */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setBackgroundType('color')}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                                        backgroundType === 'color'
                                            ? "bg-primary text-white"
                                            : "bg-surface text-text-muted hover:text-white"
                                    )}
                                >
                                    <Palette className="w-4 h-4 inline mr-2" />
                                    Gradients
                                </button>
                                <button
                                    onClick={() => setBackgroundType('image')}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                                        backgroundType === 'image'
                                            ? "bg-primary text-white"
                                            : "bg-surface text-text-muted hover:text-white"
                                    )}
                                >
                                    <Image className="w-4 h-4 inline mr-2" />
                                    Images
                                </button>
                            </div>

                            {/* Gradient Options */}
                            {backgroundType === 'color' && (
                                <div className="grid grid-cols-4 gap-3">
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            onClick={() => setBackgroundValue(color.value)}
                                            className={cn(
                                                "h-20 rounded-xl transition-all relative overflow-hidden",
                                                backgroundValue === color.value && "ring-2 ring-white ring-offset-2 ring-offset-background"
                                            )}
                                            style={{ background: color.value }}
                                        >
                                            {backgroundValue === color.value && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                    <Check className="w-6 h-6 text-white" />
                                                </div>
                                            )}
                                            <span className="absolute bottom-2 left-2 text-xs text-white/80 font-medium">
                                                {color.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Image Options */}
                            {backgroundType === 'image' && (
                                <div className="grid grid-cols-3 gap-3">
                                    {PRESET_IMAGES.map((img) => (
                                        <button
                                            key={img.name}
                                            onClick={() => setBackgroundValue(img.value)}
                                            className={cn(
                                                "h-24 rounded-xl transition-all relative overflow-hidden bg-cover bg-center",
                                                backgroundValue === img.value && "ring-2 ring-white ring-offset-2 ring-offset-background"
                                            )}
                                            style={{ backgroundImage: `url(${img.value})` }}
                                        >
                                            {backgroundValue === img.value && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                    <Check className="w-6 h-6 text-white" />
                                                </div>
                                            )}
                                            <span className="absolute bottom-2 left-2 text-xs text-white font-medium drop-shadow-lg">
                                                {img.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Preview */}
                            <div>
                                <p className="text-sm text-text-muted mb-2">Preview</p>
                                <div
                                    className="h-32 rounded-xl"
                                    style={{
                                        background: backgroundType === 'color' ? backgroundValue : `url(${backgroundValue})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-text-muted mb-2 block">Board Name</label>
                                <input
                                    type="text"
                                    value={boardName}
                                    onChange={(e) => setBoardName(e.target.value)}
                                    className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-surface text-white rounded-lg hover:bg-surface-light"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="px-6 py-2 gradient-primary text-white rounded-lg btn-hover disabled:opacity-50 flex items-center gap-2"
                    >
                        {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
