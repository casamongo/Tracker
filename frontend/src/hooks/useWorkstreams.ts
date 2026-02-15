/**
 * React Query hook for fetching workstreams data.
 */
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const useWorkstreams = () => {
  return useQuery({
    queryKey: ['workstreams'],
    queryFn: apiClient.getWorkstreams,
    refetchOnWindowFocus: false,
  });
};
