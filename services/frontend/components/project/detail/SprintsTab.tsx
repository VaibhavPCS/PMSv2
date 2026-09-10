'use client';

import React from "react";
import { fetchData, postData, deleteData } from "@/lib/fetch-util";
import { toast } from "sonner";
import { SprintList } from "@/components/sprint/SprintList";
import { SprintDetails } from "@/components/sprint/SprintDetails";
import BacklogView from "@/components/sprint/BacklogView";
import type { CurrentUser } from "./types";

interface SprintsTabProps {
  projectId: string;
  sprintView: 'list' | 'details' | 'backlog';
  setSprintView: React.Dispatch<React.SetStateAction<'list' | 'details' | 'backlog'>>;
  selectedSprint: any;
  setSelectedSprint: React.Dispatch<React.SetStateAction<any>>;
  sprintListRefreshKey: number;
  setSprintListRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  fetchSprintStatus: () => void;
  setShowSprintModal: React.Dispatch<React.SetStateAction<boolean>>;
  isAdmin: boolean;
  isProjectLead: boolean;
  projectRole: string;
  currentUser: CurrentUser | null;
  navigate: (path: string) => void;
}

export const SprintsTab: React.FC<SprintsTabProps> = ({
  projectId,
  sprintView,
  setSprintView,
  selectedSprint,
  setSelectedSprint,
  sprintListRefreshKey,
  setSprintListRefreshKey,
  fetchSprintStatus,
  setShowSprintModal,
  isAdmin,
  isProjectLead,
  projectRole,
  currentUser,
  navigate,
}) => {
  return (
    <>
      {/* Sprint Views */}
      {sprintView === 'list' && (
        <SprintList
          key={sprintListRefreshKey}
          projectId={projectId!}
          onStartSprint={async (sprintId: string) => {
            try {
              await postData(`/sprint/${sprintId}/start`, {});
              toast.success('Sprint started successfully');
              fetchSprintStatus();
              setSprintListRefreshKey((prev) => prev + 1);
            } catch (error: any) {
              console.error('Start sprint error:', error);
              const errorMessage = error.response?.data?.message || error.message || 'Failed to start sprint';
              toast.error(errorMessage);
            }
          }}
          onViewSprintDetails={async (sprintId: string) => {
            // Check user permissions before opening sprint details
            const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();

            // Privileged roles that can bypass task requirement
            const isPrivilegedUser =
              isAdmin ||
              isProjectLead ||
              projectRole === 'tl' ||
              projectRole === 'lead' ||
              projectRole === 'owner';

            // If user is privileged, allow access immediately
            if (isPrivilegedUser) {
              setSelectedSprint(sprintId);
              setSprintView('details');
              return;
            }

            // For non-privileged users, check if they have tasks in this sprint
            try {
              const sprintData = await fetchData(`/sprint/${sprintId}`);
              const userTasks = (sprintData.data.tasks as any[]).filter(
                (task: any) => task.assignee?._id?.toString() === currentUserIdStr
              );

              if (userTasks.length > 0) {
                // User has tasks in this sprint, allow access
                setSelectedSprint(sprintId);
                setSprintView('details');
              } else {
                // User has no tasks in this sprint, deny access
                toast.error('You do not have permission to view this sprint. Only team leads, project leads, admins, and users with tasks in the sprint can access it.');
              }
            } catch (error: any) {
              console.error('Error checking sprint access:', error);
              toast.error('Failed to check sprint access permissions');
            }
          }}
          onEditSprint={(sprint: any) => {
            setSelectedSprint(sprint);
            setShowSprintModal(true);
          }}
          onDeleteSprint={async (sprintId: string) => {
            try {
              await deleteData(`/sprint/${sprintId}`);
              toast.success('Sprint deleted successfully');
              fetchSprintStatus();
              setSprintListRefreshKey((prev) => prev + 1);
            } catch (error: any) {
              toast.error(error.message || 'Failed to delete sprint');
            }
          }}
          onCreateSprint={() => {
            setSelectedSprint(null);
            setShowSprintModal(true);
          }}
          onCompleteSprint={async (sprintId: string) => {
            try {
              await postData(`/sprint/${sprintId}/complete`, {});
              toast.success('Sprint completed successfully');
              fetchSprintStatus();
              setSprintListRefreshKey((prev) => prev + 1);
            } catch (error: any) {
              toast.error(error.message || 'Failed to complete sprint');
            }
          }}
        />
      )}

      {sprintView === 'details' && selectedSprint && (
        <SprintDetails
          sprintId={typeof selectedSprint === 'string' ? selectedSprint : selectedSprint._id}
          onBack={() => {
            setSprintView('list');
            setSelectedSprint(null);
          }}
          onEditSprint={(sprint: any) => {
            setSelectedSprint(sprint);
            setShowSprintModal(true);
          }}
          onDeleteSprint={async (sprintId: string) => {
            try {
              await deleteData(`/sprint/${sprintId}`);
              toast.success('Sprint deleted successfully');
              setSprintView('list');
              setSelectedSprint(null);
              fetchSprintStatus();
              setSprintListRefreshKey((prev) => prev + 1);
            } catch (error: any) {
              toast.error(error.message || 'Failed to delete sprint');
            }
          }}
          onCompleteSprint={async (sprintId: string) => {
            try {
              await postData(`/sprint/${sprintId}/complete`, {});
              toast.success('Sprint completed successfully');
              setSprintView('list');
              setSelectedSprint(null);
              fetchSprintStatus();
            } catch (error: any) {
              toast.error(error.message || 'Failed to complete sprint');
            }
          }}
          onViewTask={(taskId: string) => {
            navigate(`/task/${taskId}`);
          }}
        />
      )}

      {sprintView === 'backlog' && (
        <BacklogView
          projectId={projectId!}
          onViewTask={(taskId: string) => {
            navigate(`/task/${taskId}`);
          }}
          onAssignToSprint={(taskId: string) => {
            // TODO: Open task edit modal with sprint selector
            toast.info('Sprint assignment feature coming soon');
          }}
        />
      )}
    </>
  );
};

export default SprintsTab;
