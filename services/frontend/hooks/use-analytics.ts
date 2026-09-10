'use client';

// Analytics react-query hooks. Query keys + endpoints ported VERBATIM from the
// OLD app/features/analytics/hooks (['analytics', ...] keys, stale times, etc.).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { analyticsApi, queryKeys } from '@/lib/api';
import type {
  LeaderboardResponse,
  WorkspaceSummary,
  ProjectAnalyticsResponse,
  ProjectAnalyticsParams,
  UserProductivityStats,
  ApiError,
} from '@/types';

export function useLeaderboardAnalytics() {
  return useQuery<LeaderboardResponse, ApiError>({
    queryKey: queryKeys.analyticsLeaderboard,
    queryFn: () => analyticsApi.leaderboard(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useWorkspaceAnalytics(workspaceId: string) {
  return useQuery<WorkspaceSummary, ApiError>({
    queryKey: queryKeys.analyticsWorkspace(workspaceId),
    queryFn: () => analyticsApi.workspace(workspaceId),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useProjectAnalytics({ projectId, startDate, endDate }: ProjectAnalyticsParams) {
  return useQuery<ProjectAnalyticsResponse, ApiError>({
    queryKey: queryKeys.analyticsProject(projectId, startDate, endDate),
    queryFn: () => analyticsApi.project(projectId, startDate, endDate),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useProjectAllAnalytics() {
  return useQuery({
    queryKey: queryKeys.analyticsProjectAll,
    queryFn: () => analyticsApi.projectAll(),
    staleTime: 5 * 60 * 1000,
  });
}

interface UseUserAnalyticsOptions {
  enabled?: boolean;
}

export function useUserAnalytics(userId: string, options?: UseUserAnalyticsOptions) {
  return useQuery<UserProductivityStats>({
    queryKey: queryKeys.analyticsUser(userId),
    queryFn: () => analyticsApi.user(userId),
    enabled: !!userId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useApprovalStats(query = '') {
  return useQuery({
    queryKey: queryKeys.analyticsApprovalStats(query),
    queryFn: () => analyticsApi.approvalStats(query),
    staleTime: 5 * 60 * 1000,
  });
}

export function useApprovalTasks(query = '') {
  return useQuery({
    queryKey: queryKeys.analyticsApprovalTasks(query),
    queryFn: () => analyticsApi.approvalTasks(query),
    staleTime: 5 * 60 * 1000,
  });
}

export function useManualRefresh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => analyticsApi.refresh(),
    onSuccess: (data) => {
      toast.success('Analytics Refresh Initiated', {
        description: data.message || 'Data will be updated within a few minutes.',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
    },
    onError: (error: any) => {
      toast.error('Refresh Failed', {
        description:
          error?.message || 'Failed to trigger analytics refresh. Please try again.',
      });
    },
  });
}
