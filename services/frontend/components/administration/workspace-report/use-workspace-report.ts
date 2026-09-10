'use client';

// Data + derived-metrics logic for the Workspace Comprehensive Report.
// Extracted VERBATIM from OLD app/routes/administration/project-management/
// workspace-report.tsx (state, init effect, analyze/download, useMemo selectors).
// Uses the NEW microservice api layer (analyticsApi.workspaceSnapshot /
// workspaceReportDownload). Consumed by WorkspaceReportView.tsx.

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { apiClient as axios } from '@/lib/axios';
import { analyticsApi } from '@/lib/api/analytics';

export type Workspace = { _id: string; name: string };

export function useWorkspaceReport() {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await axios.get('/auth/me');
        const src = me.data?.user?.workspaces || me.data?.workspaces || [];
        const wps: Workspace[] = src.map((w: any) => ({
          _id: w.workspaceId?._id || w._id || w.id,
          name: w.workspaceId?.name || w.name,
        }));
        setWorkspaces(wps);
        const current =
          typeof window !== 'undefined'
            ? localStorage.getItem('currentWorkspaceId')
            : null;
        const pick =
          current && wps.find((w) => w._id === current)
            ? current
            : wps[0]?._id || '';
        if (pick) {
          setWorkspaceId(pick);
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentWorkspaceId', pick);
          }
        }
      } catch {}
    };
    init();
  }, []);

  const fmt = (d: Date | null) => (d ? format(d, 'yyyy-MM-dd') : '');

  const analyze = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      // Try snapshot-based endpoint first (40x faster!)
      const res = await analyticsApi.workspaceSnapshot(workspaceId);
      // Defensive parse: response?.data?.data ?? response?.data ?? <oldKey>.
      // analyticsApi.workspaceSnapshot already unwraps the axios envelope, so
      // `res` is the response body { source, lastUpdated, data }.
      if (res?.source === 'snapshot') {
        // Using snapshot data - 10-50ms response time
        console.log('✅ Using cached workspace snapshot (fast!)', {
          lastUpdated: res?.lastUpdated,
          workspaceId,
        });
        setReport(res?.data?.data ?? res?.data ?? res);
      } else {
        // Fallback to real-time calculation
        console.warn(
          '⚠️ No snapshot available, using real-time calculation (slower)'
        );
        setReport(res?.data?.data ?? res?.data ?? res);
      }
    } catch (err) {
      console.error('Error loading workspace report:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!workspaceId) return;
    const data = await analyticsApi.workspaceReportDownload(
      workspaceId,
      startDate && endDate ? fmt(startDate) : undefined,
      startDate && endDate ? fmt(endDate) : undefined
    );
    const blob = new Blob([data], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `workspace-${workspaceId}-report.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const timelineData = useMemo(() => {
    const tl = report?.timeline || [];
    return tl.map((r: any) => ({
      date: r.date,
      Created: r.tasksCreated || 0,
      Completed: r.tasksCompleted || 0,
    }));
  }, [report]);

  const statusData = useMemo(() => {
    const projects = report?.projects || [];
    const agg: any = {};
    projects.forEach((p: any) => {
      Object.entries(p.statusDistribution || {}).forEach(([k, v]: any) => {
        agg[k] = (agg[k] || 0) + Number(v);
      });
    });
    return Object.keys(agg).map((k) => ({ status: k, count: agg[k] }));
  }, [report]);

  const priorityData = useMemo(() => {
    const projects = report?.projects || [];
    const agg: any = {};
    projects.forEach((p: any) => {
      Object.entries(p.priorityDistribution || {}).forEach(([k, v]: any) => {
        agg[k] = (agg[k] || 0) + Number(v);
      });
    });
    return Object.keys(agg).map((k) => ({ priority: k, count: agg[k] }));
  }, [report]);

  const lifecycleSections = useMemo(() => {
    const projects = report?.projects || [];
    return projects.map((p: any) => {
      const rows = (p.tasksDetail || []).map((td: any) => {
        const m = td.lifecycle?.metrics || {};
        const cnt = (td.lifecycle?.timeline || []).length;
        return {
          task: td.title,
          totalHours: m.totalDuration || 0,
          workingHours: m.workingDuration || 0,
          rejections: m.rejectionCount || 0,
          approvals: m.approvalAttempts || 0,
          reassignments: m.reassignments || 0,
          events: cnt,
        };
      });
      const agg: any = {};
      (p.tasksDetail || []).forEach((td: any) => {
        (td.lifecycle?.timeline || []).forEach((ev: any) => {
          const k = ev.eventType || 'unknown';
          agg[k] = (agg[k] || 0) + 1;
        });
      });
      const chart = Object.keys(agg).map((k) => ({ event: k, count: agg[k] }));
      return { projectName: p.project?.name || '', rows, chart };
    });
  }, [report]);

  return {
    workspaceId,
    setWorkspaceId,
    workspaces,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    report,
    setReport,
    loading,
    analyze,
    downloadExcel,
    timelineData,
    statusData,
    priorityData,
    lifecycleSections,
  };
}
