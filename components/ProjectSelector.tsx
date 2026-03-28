'use client';

import { useState, useEffect } from 'react';
import { X, Plus, FolderOpen } from 'lucide-react';
import { useAppStore, Project } from '@/lib/store';

interface ProjectSelectorProps {
  conversationId: string;
  currentProjectId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectSelector({
  conversationId,
  currentProjectId,
  isOpen,
  onClose,
}: ProjectSelectorProps) {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3B82F6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { projects, fetchProjects, createProject, moveConversationToProject } = useAppStore();

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen, fetchProjects]);

  const handleSelectProject = async (projectId: string | null) => {
    setIsSubmitting(true);
    try {
      await moveConversationToProject(conversationId, projectId);
      onClose();
    } catch (error) {
      console.error('Failed to move conversation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSubmitting(true);
    try {
      const project = await createProject(newProjectName, undefined, newProjectColor);
      await moveConversationToProject(conversationId, project.id);
      setNewProjectName('');
      setNewProjectColor('#3B82F6');
      setIsCreatingNew(false);
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const projectList = Object.values(projects);

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Orange' },
    { value: '#EF4444', label: 'Red' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Move to Project
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!isCreatingNew ? (
              <>
                {/* No Project Option */}
                <button
                  onClick={() => handleSelectProject(null)}
                  disabled={isSubmitting}
                  className={`w-full p-3 text-left rounded-lg transition-colors ${
                    currentProjectId === null
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      No Project
                    </span>
                  </div>
                </button>

                {/* Projects List */}
                <div className="mt-3 space-y-2">
                  {projectList.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project.id)}
                      disabled={isSubmitting}
                      className={`w-full p-3 text-left rounded-lg transition-colors ${
                        currentProjectId === project.id
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color || '#3B82F6' }}
                        />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {project.name}
                        </span>
                        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                          {project.conversationCount} conversations
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Create New Project Button */}
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="w-full mt-3 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Project</span>
                </button>
              </>
            ) : (
              /* Create New Project Form */
              <form onSubmit={handleCreateProject}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      autoFocus
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Color
                    </label>
                    <div className="flex gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setNewProjectColor(color.value)}
                          className={`w-8 h-8 rounded-full transition-transform ${
                            newProjectColor === color.value ? 'scale-125 ring-2 ring-offset-2 ring-yellow-500' : ''
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNew(false);
                        setNewProjectName('');
                        setNewProjectColor('#3B82F6');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-black bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSubmitting || !newProjectName.trim()}
                    >
                      {isSubmitting ? 'Creating...' : 'Create & Move'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
