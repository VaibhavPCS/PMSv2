'use client';

// Data + actions for the Project Analytics Dashboard.
// Extracted VERBATIM from OLD project-analytics.tsx (init/workspace/project
// effects, generateAnalytics, downloadCSV). Consumed by ProjectAnalyticsView.tsx.

import { useEffect, useState } from 'react';
import { apiClient as axios } from '@/lib/axios';
import type { Workspace, Project, AnalyticsData } from './types';

export function useProjectAnalytics() {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      // Set default date range (last 30 days) regardless of network status
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      setEndDate(end.toISOString().split('T')[0])
      setStartDate(start.toISOString().split('T')[0])

      try {
        const wsLocal = localStorage.getItem('currentWorkspaceId') || ''
        const me = await axios.get('/auth/me')
        const wps: Workspace[] = (me.data?.user?.workspaces || me.data?.workspaces || []).map((w: any) => ({ _id: w.workspaceId?._id || w._id || w.id, name: w.workspaceId?.name || w.name }))
        setWorkspaces(wps)
        if (wsLocal && wps.find(w => w._id === wsLocal)) {
          setWorkspaceId(wsLocal)
        } else if (wps.length > 0) {
          setWorkspaceId(wps[0]._id)
          localStorage.setItem('currentWorkspaceId', wps[0]._id)
        }
      } catch (e) {
        setError('Unable to load workspace info. You can still select dates and generate when backend is available.')
      }
    }
    init()
  }, [])

  useEffect(() => {
    const loadProjects = async () => {
      if (!workspaceId) return
      try {
        const res = await axios.get(`/analytics/workspace/${workspaceId}?refresh=true`)
        const raw = (res.data?.projects || res.data?.activeProjects || [])
        const ps: Project[] = raw
          .map((p: any) => ({ _id: p._id || p.projectId || p.id, title: p.title || p.projectName || p.name }))
          .filter((p: Project) => /^[a-f\d]{24}$/i.test(p._id))
        setProjects(ps)
        if (ps.length > 0) {
          setProjectId(ps[0]._id)
        }
      } catch { }
    }
    loadProjects()
  }, [workspaceId])

  const generateAnalytics = async () => {
    if (!projectId || !startDate || !endDate) return
    try {
      setLoading(true)
      setError('')
      const res = await axios.get(`/analytics/project/${projectId}/comprehensive?startDate=${startDate}&endDate=${endDate}`)
      setAnalytics(res.data)
    } catch (e: any) {
      setError('Failed to generate analytics: ' + (e.response?.data?.message || e.message))
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = async () => {
    if (!projectId || !startDate || !endDate) return
    try {
      const response = await axios.get(`/analytics/export/project/${projectId}/comprehensive?startDate=${startDate}&endDate=${endDate}`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `project-analytics-${projectId}-${Date.now()}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
    } catch (e: any) {
      console.error('Failed to download CSV:', e)
    }
  }

  return {
    workspaceId, setWorkspaceId,
    workspaces, projects,
    projectId, setProjectId,
    startDate, setStartDate, endDate, setEndDate,
    analytics, loading, error,
    generateAnalytics, downloadCSV,
  };
}
