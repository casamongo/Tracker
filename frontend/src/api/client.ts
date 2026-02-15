/**
 * API client for backend communication.
 */
import axios from 'axios';
import type {
  WorkstreamsResponse,
  GenerateUpdatesRequest,
  GenerateUpdatesResponse,
  PostToJiraRequest,
  PostToSheetRequest,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Get all workstreams
  getWorkstreams: async (): Promise<WorkstreamsResponse> => {
    const response = await api.get<WorkstreamsResponse>('/workstreams');
    return response.data;
  },

  // Generate updates for specific milestones
  generateUpdates: async (
    request: GenerateUpdatesRequest
  ): Promise<GenerateUpdatesResponse> => {
    const response = await api.post<GenerateUpdatesResponse>(
      '/generate-updates',
      request
    );
    return response.data;
  },

  // Run full workflow for all milestones
  runAll: async (): Promise<GenerateUpdatesResponse> => {
    const response = await api.post<GenerateUpdatesResponse>('/run-all');
    return response.data;
  },

  // Post update to Jira
  postToJira: async (request: PostToJiraRequest): Promise<{ message: string; success: boolean }> => {
    const response = await api.post('/post-to-jira', request);
    return response.data;
  },

  // Post comment to Sheet
  postToSheet: async (request: PostToSheetRequest): Promise<{ message: string; success: boolean }> => {
    const response = await api.post('/post-to-sheet', request);
    return response.data;
  },
};
