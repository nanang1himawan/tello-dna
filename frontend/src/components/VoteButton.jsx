import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { votesApi } from '../lib/api';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * VoteButton - Upvote/downvote cards
 * @param {Object} props
 * @param {string|number} props.taskId - Task ID
 * @param {string} props.className - Additional classes
 */
export default function VoteButton({ taskId, className }) {
    const queryClient = useQueryClient();

    // Fetch vote status
    const { data: voteData } = useQuery({
        queryKey: ['task-votes', taskId],
        queryFn: () => votesApi.getByTask(taskId),
        enabled: !!taskId,
    });
    const voteCount = voteData?.data?.data?.vote_count || 0;
    const hasVoted = voteData?.data?.data?.has_voted || false;

    // Toggle mutation
    const toggleMutation = useMutation({
        mutationFn: () => votesApi.toggle(taskId, 'up'),
        onSuccess: () => {
            queryClient.invalidateQueries(['task-votes', taskId]);
            queryClient.invalidateQueries(['board']);
        },
    });

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                toggleMutation.mutate();
            }}
            disabled={toggleMutation.isPending}
            className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                hasVoted
                    ? "bg-green-500/10 text-green-400 border border-green-500/30"
                    : "bg-surface text-text-muted hover:text-white",
                className
            )}
        >
            {toggleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <ThumbsUp className={cn("w-4 h-4", hasVoted && "fill-green-400")} />
            )}
            <span>{voteCount}</span>
        </button>
    );
}
