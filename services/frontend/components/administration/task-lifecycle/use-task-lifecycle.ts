'use client';

// Data + actions for the Task Lifecycle dashboard.
// Extracted VERBATIM from OLD task-lifecycle.tsx (init/workspace/project/task
// effects, lifecycle load, downloadCsv). Consumed by TaskLifecycleView.tsx.
// Lifecycle fetch goes through the NEW analytics microservice layer
// (analyticsApi.taskLifecycle) and parses responses DEFENSIVELY.

import { useEffect, useState } from 'react';
import { apiClient as axios } from '@/lib/axios';
import { analyticsApi } from '@/lib/api/analytics';
import type { Workspace, Project, Task } from './types';

export function useTaskLifecycle() {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState<string>('');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      try {
        const wsLocal = localStorage.getItem('currentWorkspaceId') || ''
        // Load user workspaces
        const me = await axios.get('/auth/me')
        const wps: Workspace[] = (me.data?.user?.workspaces || me.data?.workspaces || []).map((w: any) => ({ _id: w.workspaceId?._id || w._id || w.id, name: w.workspaceId?.name || w.name }))
        setWorkspaces(wps)
        if (wsLocal && wps.find(w => w._id === wsLocal)) {
          setWorkspaceId(wsLocal)
        } else if (wps.length > 0) {
          setWorkspaceId(wps[0]._id)
          localStorage.setItem('currentWorkspaceId', wps[0]._id)
        }
      } catch { }
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
          // If current project is not in new list, reset to first
          const exists = ps.some(p => p._id === projectId)
          setProjectId(exists ? projectId : ps[0]._id)
        } else {
          setProjectId('')
        }
      } catch { }
    }
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  useEffect(() => {
    const loadTasks = async () => {
      if (!projectId) return
      const valid = projects.some(p => p._id === projectId)
      const isObjectId = /^[a-f\d]{24}$/i.test(projectId)
      if (!valid || !isObjectId) {
        setTasks([])
        setTaskId('')
        return
      }
      try {
        const res = await axios.get(`/task/project/${projectId}`)
        const ts: Task[] = (res.data?.tasks || []).map((t: any) => ({ _id: t._id, title: t.title }))
        setTasks(ts)
        if (ts.length > 0) setTaskId(ts[0]._id)
      } catch (err: any) {
        console.warn('Failed to load tasks for project', projectId, err?.response?.status)
        setTasks([])
        setTaskId('')
      }
    }
    loadTasks()
  }, [projectId, projects])

  useEffect(() => {
    const loadLifecycle = async () => {
      if (!taskId) return
      try {
        setLoading(true)
        // NEW microservice layer: analyticsApi.taskLifecycle already returns
        // r.data. Parse DEFENSIVELY across new microservice envelope shapes:
        // response?.data?.data ?? response?.data ?? <oldKey>.
        const response: any = await analyticsApi.taskLifecycle(taskId)
        const payload = response?.data?.data ?? response?.data ?? response ?? {}
        setTimeline(payload?.timeline ?? response?.timeline ?? [])
        setMetrics(payload?.metrics ?? response?.metrics ?? {})
      } catch { }
      finally { setLoading(false) }
    }
    loadLifecycle()
  }, [taskId])

  const canDownload = !!workspaceId && !!projectId && !!taskId

  const downloadCsv = async () => {
    if (!canDownload) return
    const resp = await axios.get(`/analytics/export/task/${taskId}/lifecycle`, { responseType: 'blob' })
    const blob = new Blob([resp.data], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `task-${taskId}-lifecycle.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  return {
    workspaceId, setWorkspaceId,
    workspaces,
    projects, projectId, setProjectId,
    tasks, taskId, setTaskId,
    timeline, metrics, loading,
    canDownload, downloadCsv,
  };
}
