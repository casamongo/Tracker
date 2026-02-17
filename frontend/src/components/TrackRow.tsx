/**
 * Track row component for grouping milestones.
 */
import { FileText } from 'lucide-react';
import type { Track } from '@/types';

interface TrackRowProps {
  track: Track;
}

export const TrackRow = ({ track }: TrackRowProps) => {
  return (
    <tr className="bg-blue-50 border-b border-blue-200">
      <td colSpan={10} className="px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
          <span>Track: {track.name}</span>
          {track.notes_link && (
            <>
              <span className="text-blue-700">|</span>
              <a
                href={track.notes_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                <span>📝 Notes</span>
              </a>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};
