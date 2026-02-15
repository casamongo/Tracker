/**
 * Preview modal component for reviewing and editing AI-generated updates.
 */
import { useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import type { MilestoneUpdate } from '@/types';
import { apiClient } from '@/api/client';

interface PreviewModalProps {
  update: MilestoneUpdate;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PreviewModal = ({ update, isOpen, onClose, onSuccess }: PreviewModalProps) => {
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editedSheetComment, setEditedSheetComment] = useState(update.sheet_comment);
  const [editedJiraUpdate, setEditedJiraUpdate] = useState({
    progress_summary: update.jira_update.progress_summary.join('\n'),
    recent_changes: update.jira_update.recent_changes
      .map((c) => `${c.description} (${c.date})`)
      .join('\n'),
    next_steps: update.jira_update.next_steps.join('\n'),
  });

  if (!isOpen) return null;

  const handlePost = async () => {
    setIsPosting(true);
    setError(null);
    setSuccess(null);

    try {
      // Build the Jira comment body in markdown format
      const jiraCommentBody = `📊 **Progress Summary**
${editedJiraUpdate.progress_summary.split('\n').map((line) => `- ${line}`).join('\n')}

🔄 **Recent Changes** *(from ${update.jira_update.source_label})*
${editedJiraUpdate.recent_changes.split('\n').map((line) => `- ${line}`).join('\n')}

🚀 **Next Steps**
${editedJiraUpdate.next_steps.split('\n').map((line) => `- ${line}`).join('\n')}`;

      // Post to Jira
      await apiClient.postToJira({
        jira_id: update.jira_id,
        comment_body: jiraCommentBody,
      });

      // Post to Sheet
      await apiClient.postToSheet({
        row_index: update.row_index,
        comment: editedSheetComment,
      });

      setSuccess('Successfully posted to Jira and updated sheet!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post update');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Preview Update: {update.milestone}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Jira ID: {update.jira_id} | Row: {update.row_index}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isPosting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Sheet Comment Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sheet Comment (One-line summary)
            </label>
            <textarea
              value={editedSheetComment}
              onChange={(e) => setEditedSheetComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="[Mon DD] Key achievement. Current state. What's next."
            />
            <p className="text-xs text-gray-500 mt-1">
              Character count: {editedSheetComment.length} / 120
            </p>
          </div>

          {/* Jira Update Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Progress Summary
            </label>
            <textarea
              value={editedJiraUpdate.progress_summary}
              onChange={(e) =>
                setEditedJiraUpdate({ ...editedJiraUpdate, progress_summary: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows={4}
              placeholder="One bullet point per line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔄 Recent Changes ({update.jira_update.source_label})
            </label>
            <textarea
              value={editedJiraUpdate.recent_changes}
              onChange={(e) =>
                setEditedJiraUpdate({ ...editedJiraUpdate, recent_changes: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows={4}
              placeholder="Change description (Date) - one per line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🚀 Next Steps
            </label>
            <textarea
              value={editedJiraUpdate.next_steps}
              onChange={(e) =>
                setEditedJiraUpdate({ ...editedJiraUpdate, next_steps: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows={3}
              placeholder="One action item per line"
            />
          </div>

          {/* Status Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <a
            href={`https://yourorg.atlassian.net/browse/${update.jira_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-sm"
          >
            View in Jira <ExternalLink className="w-4 h-4" />
          </a>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPosting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={isPosting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {isPosting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPosting ? 'Posting...' : 'Post to Jira & Sheet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
