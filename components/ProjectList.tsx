'use client';

import { useEffect } from 'react';
import { Folder, Plus, FolderOpen } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ProjectListProps {
  onSelectProject: (projectId: string | null) => void;
  selectedProjectId?: string | null;
  onCreateNew?: () => void;
}

export default function ProjectList({ onSelectProject, selectedProjectId, onCreateNew }: ProjectListProps) {
  const { projects, fetchProjects, user, viewAsUser } = useAppStore();

  useEffect(() => {
    // Only fetch projects if user is authenticated
    if (user) {
      fetchProjects().catch(console.error);
    }
  }, [fetchProjects, user, viewAsUser?.id]);

  const projectList = Object.values(projects)
    .sort((a, b) => {
      const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
      const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

  return (
    <div className="w-full">
      {/* New Project Button */}
      {onCreateNew && (
        <div className="px-3 py-2">
          <button
            onClick={onCreateNew}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-gray-600 dark:text-gray-400"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Project</span>
          </button>
        </div>
      )}

      {/* Projects List */}
      {projectList.length > 0 ? (
        <div className="px-3 py-2">
          <div className="space-y-1">
            {projectList.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  selectedProjectId === project.id
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color || '#3B82F6' }}
                />
                <Folder className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate flex-1 text-left">
                  {project.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {project.conversationCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-3 py-2">
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No projects yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
