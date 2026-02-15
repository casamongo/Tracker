/**
 * Status badge component for displaying milestone status.
 */
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === 'done') return 'bg-green-100 text-green-800 border-green-300';
    if (lower === 'on track') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (lower === 'at risk') return 'bg-orange-100 text-orange-800 border-orange-300';
    if (lower === 'blocked') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getStatusColor(status)
      )}
    >
      {status}
    </span>
  );
};
