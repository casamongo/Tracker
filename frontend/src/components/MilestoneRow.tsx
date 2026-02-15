/**
 * Milestone row component.
 */
import { FileText, ExternalLink } from 'lucide-react';
import type { Milestone } from '@/types';
import { StatusBadge } from './StatusBadge';

interface MilestoneRowProps {
  milestone: Milestone;
  isEven: boolean;
  onPreview: () => void;
}

export const MilestoneRow = ({ milestone, isEven, onPreview }: MilestoneRowProps) => {
  return (
    <tr className={isEven ? 'bg-white' : 'bg-gray-50'}>
      <td className="px-4 py-3 text-sm">Milestone</td>
      <td className="px-4 py-3 text-sm font-medium">{milestone.track}</td>
      <td className="px-4 py-3">
        <StatusBadge status={milestone.status} />
      </td>
      <td className="px-4 py-3 text-sm">{milestone.target_date}</td>
      <td className="px-4 py-3 text-sm">{milestone.owner}</td>
      <td className="px-4 py-3 text-sm">
        {milestone.jira_id && (
          <a
            href={`https://yourorg.atlassian.net/browse/${milestone.jira_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
          >
            {milestone.jira_id}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
        {milestone.comments}
      </td>
      <td className="px-4 py-3 text-sm">{milestone.slack_channel}</td>
      <td className="px-4 py-3">
        {milestone.notes_link && (
          <a
            href={milestone.notes_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
          </a>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onPreview}
          className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
        >
          👁 Preview
        </button>
      </td>
    </tr>
  );
};
