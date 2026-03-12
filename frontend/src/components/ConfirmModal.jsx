import { AlertTriangle, Loader2, X } from 'lucide-react';

/**
 * Beautiful confirm modal for delete and other destructive actions
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onConfirm - Function to execute on confirm
 * @param {string} props.title - Modal title
 * @param {string} props.message - Modal message
 * @param {string} props.confirmText - Confirm button text
 * @param {string} props.cancelText - Cancel button text
 * @param {string} props.variant - 'danger' | 'warning' | 'info'
 * @param {boolean} props.isLoading - Whether the action is in progress
 */
export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false
}) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'bg-red-500/20 text-red-400',
            button: 'bg-red-500 hover:bg-red-600 text-white',
            border: 'border-red-500/30'
        },
        warning: {
            icon: 'bg-yellow-500/20 text-yellow-400',
            button: 'bg-yellow-500 hover:bg-yellow-600 text-black',
            border: 'border-yellow-500/30'
        },
        info: {
            icon: 'bg-blue-500/20 text-blue-400',
            button: 'bg-blue-500 hover:bg-blue-600 text-white',
            border: 'border-blue-500/30'
        }
    };

    const styles = variantStyles[variant] || variantStyles.danger;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative bg-background border ${styles.border} rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200`}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-lg text-text-muted hover:text-white hover:bg-surface transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-full ${styles.icon} flex items-center justify-center mx-auto mb-4`}>
                        <AlertTriangle className="w-7 h-7" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-white text-center mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-text-muted text-center text-sm mb-6">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 bg-surface hover:bg-surface-light text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-4 py-2.5 ${styles.button} rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
