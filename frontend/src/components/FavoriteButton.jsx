import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '../lib/api';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * FavoriteButton - Toggle favorite status for projects/boards/tasks
 * @param {Object} props
 * @param {'project'|'board'|'task'} props.entityType
 * @param {string|number} props.entityId
 * @param {boolean} props.initialFavorite - Initial favorite state
 * @param {string} props.className - Additional classes
 */
export default function FavoriteButton({
    entityType,
    entityId,
    initialFavorite = false,
    className
}) {
    const queryClient = useQueryClient();

    // Fetch favorites to check current state
    const { data: favoritesData } = useQuery({
        queryKey: ['favorites', entityType],
        queryFn: () => favoritesApi.getAll(entityType),
    });

    // Check if this entity is favorited
    const favorites = favoritesData?.data?.data || [];
    const isFavorite = favorites.some(f => f.entity_id == entityId) || initialFavorite;

    // Toggle mutation
    const toggleMutation = useMutation({
        mutationFn: () => favoritesApi.toggle(entityType, entityId),
        onSuccess: () => {
            queryClient.invalidateQueries(['favorites']);
            queryClient.invalidateQueries(['projects']);
        },
    });

    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMutation.mutate();
            }}
            disabled={toggleMutation.isPending}
            className={cn(
                "p-2 rounded-lg transition-all",
                isFavorite
                    ? "text-yellow-400 hover:text-yellow-300"
                    : "text-text-muted hover:text-yellow-400",
                className
            )}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
            {toggleMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Star className={cn("w-5 h-5", isFavorite && "fill-yellow-400")} />
            )}
        </button>
    );
}
