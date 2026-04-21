import Link from 'next/link';
import { Calendar, Users } from 'lucide-react';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ROUTES } from '@shared/constants';
import type { Project } from '@shared/types';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={ROUTES.PROJECT(project._id)}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{project.name}</h3>
        <ProjectStatusBadge status={project.status} />
      </div>
      {project.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{project.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Users size={12} />
          {project.members.length} member{project.members.length !== 1 ? 's' : ''}
        </span>
        {project.endDate && (
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {new Date(project.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
    </Link>
  );
}