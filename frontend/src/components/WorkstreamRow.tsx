/**
 * Workstream header row component.
 */
import type { Workstream } from '@/types';

interface WorkstreamRowProps {
  workstream: Workstream;
}

export const WorkstreamRow = ({ workstream }: WorkstreamRowProps) => {
  const getStatusEmoji = (status: string) => {
    if (status === 'green') return '🟢';
    if (status === 'yellow') return '🟡';
    if (status === 'red') return '🔴';
    return '⚪';
  };

  return (
    <tr className="bg-purple-100 border-b border-purple-200">
      <td colSpan={10} className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-900">
          <span>Workstream: {workstream.id.replace('ws-', '')}. {workstream.name}</span>
          <span className="text-purple-700">|</span>
          <span className="text-purple-700">PM: {workstream.pm}</span>
          <span className="text-purple-700">|</span>
          <span className="text-purple-700">Eng: {workstream.eng}</span>
          <span className="text-purple-700">|</span>
          <span className="text-purple-700">Design: {workstream.design}</span>
          <span className="text-purple-700">|</span>
          <span className="text-purple-700">Target: {workstream.target_quarter}</span>
          <span className="text-purple-700">|</span>
          <span className="text-purple-700">Status: {getStatusEmoji(workstream.status)}</span>
          <span className="text-purple-700">|</span>
          <span className="text-purple-700">{workstream.okr}</span>
        </div>
      </td>
    </tr>
  );
};
