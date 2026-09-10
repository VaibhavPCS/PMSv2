'use client';

// Data + derived-metrics logic for the Report Screen.
// Extracted VERBATIM from OLD report-screen.tsx (state, effects, fetchers,
// useMemo selectors). Consumed by ReportScreenView.tsx.

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { apiClient as axios } from '@/lib/axios';
import type { Workspace, Project, Member, TaskData, ReportData } from './types';
import { COLORS } from './types';

export function useReportScreen() {
  // Selection State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("all"); // "all" or userId

  // Filter State
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));

  // Data State
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Handover Modal State
  const [selectedTaskForHandover, setSelectedTaskForHandover] = useState<TaskData | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Accordion State
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});

  const toggleMember = (memberId: string) => {
    setExpandedMembers(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  // Sync expanded state with selection
  useEffect(() => {
    if (selectedMember !== 'all') {
      setExpandedMembers({ [selectedMember]: true });
    } else {
      setExpandedMembers({});
    }
  }, [selectedMember]);

  // Derived Metrics
  const priorityCounts = useMemo(() => {
    if (!reportData?.tasks) return { high: 0, urgent: 0, medium: 0, low: 0 };
    const counts = { high: 0, urgent: 0, medium: 0, low: 0 };
    reportData.tasks.forEach(t => {
      if (t.priority === 'urgent') counts.urgent++;
      else if (t.priority === 'high') counts.high++;
      else if (t.priority === 'medium') counts.medium++;
      else if (t.priority === 'low') counts.low++;
    });
    return counts;
  }, [reportData]);

  const avgCompletionTime = useMemo(() => {
    if (!reportData?.tasks) return 0;
    const completedTasks = reportData.tasks.filter(t => t.status === 'done' && t.completedAt && t.startDate);
    if (completedTasks.length === 0) return 0;

    const totalDays = completedTasks.reduce((acc, t) => {
      const start = new Date(t.startDate);
      const end = new Date(t.completedAt!);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return acc + diffDays;
    }, 0);

    return (totalDays / completedTasks.length).toFixed(1);
  }, [reportData]);

  // Velocity Chart Data
  const velocityData = useMemo(() => {
    if (!reportData?.tasks) return [];

    const completedTasks = reportData.tasks
      .filter(t => t.status === 'done' && t.completedAt)
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

    const dateMap = new Map<string, number>();

    completedTasks.forEach(task => {
      const date = format(new Date(task.completedAt!), 'MMM dd');
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    return Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      tasks: count
    }));
  }, [reportData]);

  // Team Performance Metrics (Radar)
  const teamPerformanceData = useMemo(() => {
    if (!reportData?.tasks || reportData.totalTasks === 0) return [];

    const completedTasks = reportData.tasks.filter(t => t.status === 'done');
    const totalCompleted = completedTasks.length;

    if (totalCompleted === 0) return [
      { subject: 'Reliability', A: 0, fullMark: 100 },
      { subject: 'Quality', A: 100, fullMark: 100 },
      { subject: 'Velocity', A: 0, fullMark: 100 },
      { subject: 'Efficiency', A: 0, fullMark: 100 },
    ];

    // Reliability: On-time completion
    const onTimeTasks = completedTasks.filter(t =>
      t.completedAt && t.dueDate && new Date(t.completedAt) <= new Date(t.dueDate)
    ).length;
    const reliability = Math.round((onTimeTasks / totalCompleted) * 100);

    // Quality: Tasks without rejections
    const perfectTasks = completedTasks.filter(t => !t.rejections || t.rejections.length === 0).length;
    const quality = Math.round((perfectTasks / totalCompleted) * 100);

    // Velocity: Completion Rate relative to total tasks in range
    const velocity = Math.round((totalCompleted / reportData.totalTasks) * 100);

    // Efficiency: Estimated Duration vs Actual Duration
    let totalEstimated = 0;
    let totalActual = 0;
    completedTasks.forEach(t => {
      if (t.durationDays && t.startDate && t.completedAt) {
        totalEstimated += t.durationDays;
        const start = new Date(t.startDate);
        const end = new Date(t.completedAt);
        const actualDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        totalActual += actualDays;
      }
    });

    const efficiency = totalActual > 0 ? Math.min(100, Math.round((totalEstimated / totalActual) * 100)) : 0;

    return [
      { subject: 'Reliability', A: reliability, fullMark: 100 },
      { subject: 'Quality', A: quality, fullMark: 100 },
      { subject: 'Velocity', A: velocity, fullMark: 100 },
      { subject: 'Efficiency', A: efficiency, fullMark: 100 },
    ];
  }, [reportData]);

  // Fetch Workspaces on Mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await axios.get('/workspace');
        const validWorkspaces = res.data.workspaces.map((w: any) => ({
          _id: w.workspaceId._id,
          name: w.workspaceId.name
        }));
        setWorkspaces(validWorkspaces);

        // Auto-select current workspace if available
        if (res.data.currentWorkspace) {
          setSelectedWorkspace(res.data.currentWorkspace._id || res.data.currentWorkspace);
        } else if (validWorkspaces.length > 0) {
          setSelectedWorkspace(validWorkspaces[0]._id);
        }
      } catch (error) {
        console.error("Failed to fetch workspaces", error);
      } finally {
        setInitializing(false);
      }
    };
    fetchWorkspaces();
  }, []);

  // Handle Workspace Change
  const handleWorkspaceChange = async (workspaceId: string) => {
    // 1. Update Selection State
    setSelectedWorkspace(workspaceId);
    setSelectedProject("");
    setReportData(null);

    // 2. Clear Dependent Data Immediately
    setProjects([]);
    setMembers([]);

    try {
      setLoading(true);
      // 3. Switch Workspace Context
      await axios.post('/workspace/switch', { workspaceId });

      // 4. Fetch Projects for new workspace
      const projRes = await axios.get('/projects');
      setProjects(projRes.data.projects || []);

    } catch (error) {
      console.error("Failed to switch workspace or fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Project Change - Fetch Members
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!selectedProject) {
        setMembers([]);
        return;
      }

      try {
        // Fetch members for the specific project
        const res = await axios.get(`/projects/${selectedProject}/team`);

        // Combine project head and members
        const allMembers: any[] = [];
        const headPool = [
          ...(res.data.projectHeads || []),
          ...(res.data.projectHead ? [res.data.projectHead] : [])
        ];
        headPool.forEach((head: any) => {
          if (head?._id && !allMembers.some((m: any) => m._id === head._id)) {
            allMembers.push({ ...head, role: 'project-head' });
          }
        });
        if (res.data.members) {
          allMembers.push(...res.data.members);
        }

        // Deduplicate by ID
        const uniqueMembers = Array.from(new Map(allMembers.map(item => [item._id, item])).values());

        setMembers(uniqueMembers);
      } catch (error) {
        console.error("Failed to fetch project members", error);
      }
    };

    fetchProjectMembers();
  }, [selectedProject]);

  // Effect to load initial data if workspace is already selected (e.g. on load)
  useEffect(() => {
    // Only run on mount/init when we have a workspace but no data
    if (selectedWorkspace && !projects.length && !initializing) {
      handleWorkspaceChange(selectedWorkspace);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspace, initializing]);

  // Generate Report
  const generateReport = async () => {
    if (!selectedProject || !startDate || !endDate) return;

    setLoading(true);
    try {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const url = `/projects/${selectedProject}/report?startDate=${startStr}&endDate=${endStr}`;
      const res = await axios.get(url);
      setReportData(res.data);
    } catch (error) {
      console.error("Failed to generate report", error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger report generation when filters change (optional, or use a button)
  // For now, let's use a button to avoid too many requests or auto-fetch if project selected
  useEffect(() => {
    if (selectedProject && startDate && endDate) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, startDate, endDate]);

  // Process Data for Charts
  const statusChartData = useMemo(() => {
    if (!reportData) return [];
    const s = reportData.statusBreakdown;
    return [
      { name: 'To Do', value: s.todo, color: COLORS.todo },
      { name: 'In Progress', value: s.inProgress, color: COLORS.inProgress },
      { name: 'On Hold', value: s.onHold, color: COLORS.onHold },
      { name: 'Approved', value: s.approved, color: COLORS.approved },
      { name: 'Not Approved', value: s.notApproved, color: COLORS.notApproved },
    ].filter(item => item.value > 0);
  }, [reportData]);

  const memberChartData = useMemo(() => {
    if (!reportData) return [];

    // Filter by selected member if set
    let memberIds = Object.keys(reportData.memberPerformance);
    if (selectedMember && selectedMember !== 'all') {
      memberIds = memberIds.filter(id => id === selectedMember);
    }

    return memberIds.map(id => {
      const stats = reportData.memberPerformance[id];
      return {
        name: stats.name || 'Unknown',
        Assigned: stats.totalAssigned,
        Completed: stats.completed,
        Reworks: stats.reworks
      };
    }).sort((a, b) => b.Completed - a.Completed); // Sort by completed
  }, [reportData, members, selectedMember]);

  return {
    // selection
    workspaces, selectedWorkspace,
    projects, selectedProject, setSelectedProject,
    members, selectedMember, setSelectedMember,
    // filters
    startDate, setStartDate, endDate, setEndDate,
    // data
    reportData, loading, initializing,
    // handover
    selectedTaskForHandover, setSelectedTaskForHandover,
    isHandoverModalOpen, setIsHandoverModalOpen,
    // accordion
    expandedMembers, toggleMember,
    // derived
    priorityCounts, avgCompletionTime, velocityData, teamPerformanceData,
    statusChartData, memberChartData,
    // actions
    handleWorkspaceChange,
  };
}
