'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewProjectDialog({ isOpen, onClose }: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState('');
  const [projectColor, setProjectColor] = useState('#4f6ef7');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { createProject, fetchProjects } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createProject(projectName, undefined, projectColor);
      await fetchProjects();
      setProjectName('');
      setProjectColor('#4f6ef7');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setProjectName('');
    setProjectColor('#4f6ef7');
    setSubmitError(null);
    onClose();
  };

  if (!isOpen) return null;

  const colorOptions = [
    { value: '#4f6ef7', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#fcc824', label: 'Amber' },
    { value: '#EF4444', label: 'Red' },
    { value: '#7c5bf6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="rounded-xl shadow-2xl w-full max-w-md border border-[#1e1e30]"
          style={{ background: 'rgba(18,18,31,0.95)', backdropFilter: 'blur(16px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#1e1e30]">
            <h2 className="text-lg font-semibold text-[#ededf5]">
              Create New Project
            </h2>
            <button
              onClick={handleClose}
              className="p-1 rounded transition-colors hover:bg-[#1e1e30]"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 text-[#9090a8]" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-5">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#9090a8] mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="w-full px-3 py-2 rounded-lg border border-[#1e1e30] text-[#ededf5] placeholder-[#5a5a72] focus:outline-none focus:ring-2 focus:ring-[#4f6ef7] transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(9,9,15,0.6)' }}
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9090a8] mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setProjectColor(color.value)}
                      className={`w-8 h-8 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-[#4f6ef7] ${
                        projectColor === color.value
                          ? 'scale-125 ring-2 ring-offset-2 ring-[#4f6ef7] ring-offset-[#12121f]'
                          : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                      aria-label={`Select ${color.label} color`}
                      aria-pressed={projectColor === color.value}
                    />
                  ))}
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-[#9090a8] border border-[#1e1e30] rounded-lg transition-colors hover:bg-[#1e1e30] hover:text-[#ededf5] disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-[#09090f] bg-[#fcc824] hover:bg-[#e6b420] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || !projectName.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
