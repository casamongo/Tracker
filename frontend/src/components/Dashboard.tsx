/**
 * Main dashboard component displaying workstreams and milestones.
 */
import React, { useState } from 'react';
import { RefreshCw, Play, Loader2 } from 'lucide-react';
import { WorkstreamRow } from './WorkstreamRow';
import { TrackRow } from './TrackRow';
import { MilestoneRow } from './MilestoneRow';
import { PreviewModal } from './PreviewModal';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { apiClient } from '@/api/client';
import type { Milestone, MilestoneUpdate } from '@/types';

export const Dashboard = () => {
  const { data, isLoading, error, refetch } = useWorkstreams();
  const [_selectedMilestone, setSelectedMilestone] = useState<{
    milestone: Milestone;
    workstreamId: string;
    index: number;
  } | null>(null);
  const [previewUpdate, setPreviewUpdate] = useState<MilestoneUpdate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [allUpdates, setAllUpdates] = useState<MilestoneUpdate[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handlePreviewClick = async (
    milestone: Milestone,
    workstreamId: string,
    index: number
  ) => {
    setSelectedMilestone({ milestone, workstreamId, index });
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await apiClient.generateUpdates({
        workstream_id: workstreamId,
        milestone_indices: [index],
      });

      if (response.updates && response.updates.length > 0) {
        setPreviewUpdate(response.updates[0]);
      } else {
        setGenerateError('No update generated for this milestone');
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate update');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    setGenerateError(null);
    setAllUpdates([]);

    try {
      const response = await apiClient.runAll();
      setAllUpdates(response.updates);
      setCurrentPreviewIndex(0);
      
      if (response.updates.length > 0) {
        setPreviewUpdate(response.updates[0]);
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to run batch update');
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleCloseModal = () => {
    setPreviewUpdate(null);
    setSelectedMilestone(null);
    setGenerateError(null);
  };

  const handleSuccess = () => {
    refetch();
    
    // If we're in batch mode, move to next update
    if (allUpdates.length > 0 && currentPreviewIndex < allUpdates.length - 1) {
      const nextIndex = currentPreviewIndex + 1;
      setCurrentPreviewIndex(nextIndex);
      setPreviewUpdate(allUpdates[nextIndex]);
    } else {
      setAllUpdates([]);
      setCurrentPreviewIndex(0);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading workstreams...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">Error loading workstreams: {String(error)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jira Update Automation</h1>
          <p className="text-gray-600 mt-1">
            Automated workflow for syncing data sources to Jira tickets
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleRunAll}
            disabled={isRunningAll}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunningAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunningAll ? 'Generating...' : 'Run Updates Now'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {generateError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{generateError}</p>
        </div>
      )}

      {/* Batch Progress */}
      {allUpdates.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            Batch mode: Reviewing update {currentPreviewIndex + 1} of {allUpdates.length}
          </p>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Work Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Track
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Target Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Milestone Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Jira ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Comments
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Slack
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Notes Link
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.workstreams.map((workstream) => {
                let workstreamMilestoneIndex = 0;
                
                return (
                  <React.Fragment key={workstream.id}>
                    <WorkstreamRow workstream={workstream} />
                    {workstream.tracks?.map((track, trackIdx) => (
                      <React.Fragment key={`${workstream.id}-track-${trackIdx}`}>
                        <TrackRow track={track} />
                        {track.milestones?.map((milestone, milestoneIdx) => {
                          const currentIndex = workstreamMilestoneIndex++;
                          return (
                            <MilestoneRow
                              key={`${workstream.id}-${milestone.row_index}`}
                              milestone={milestone}
                              isEven={milestoneIdx % 2 === 0}
                              onPreview={() => handlePreviewClick(milestone, workstream.id, currentIndex)}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loading Modal */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-900 font-medium">Generating AI update...</p>
            <p className="text-sm text-gray-600 mt-2">This may take a few moments</p>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUpdate && (
        <PreviewModal
          update={previewUpdate}
          isOpen={true}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
