'use client';

import { useEffect, useState } from 'react';
import { Folder, Plus, FolderOpen } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ProjectListProps {
  onSelectProject: (projectId: string | null) => void;
  selectedProjectId?: string | null;
  onCreateNew?: () => void;
}

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bgPage:    '#09090f',
  bgCard:    'rgba(18,18,31,0.8)',
  border:    '#1e1e30',
  textPrim:  '#ededf5',
  textMuted: '#9090a8',
  textDim:   '#5a5a72',
  blue:      '#4f6ef7',
  amber:     '#fcc824',
  purple:    '#7c5bf6',
} as const;

export default function ProjectList({ onSelectProject, selectedProjectId, onCreateNew }: ProjectListProps) {
  const { projects, fetchProjects, user, viewAsUser } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchProjects().catch((err: unknown) => {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load projects.');
    });
  }, [fetchProjects, user, viewAsUser?.id]);

  const projectList = Object.values(projects).sort((a, b) => {
    const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
    const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });

  return (
    <div style={{ width: '100%' }}>
      {/* Error banner */}
      {error && (
        <div
          style={{
            margin: '0 12px 8px',
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(252,200,36,0.1)',
            border: `1px solid ${T.amber}`,
            color: T.amber,
            fontSize: 12,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* New Project Button */}
      {onCreateNew && (
        <div style={{ padding: '8px 12px' }}>
          <button
            onClick={onCreateNew}
            aria-label="Create new project"
            style={{
              width: '100%',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              border: `2px dashed ${T.border}`,
              background: 'transparent',
              color: T.textMuted,
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = T.amber;
              el.style.color = T.amber;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = T.border;
              el.style.color = T.textMuted;
            }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span style={{ fontSize: 14, fontWeight: 500 }}>New Project</span>
          </button>
        </div>
      )}

      {/* Projects List */}
      {projectList.length > 0 ? (
        <div style={{ padding: '8px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {projectList.map((project) => {
              const isSelected = selectedProjectId === project.id;
              return (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  aria-label={`Open project: ${project.name}`}
                  aria-pressed={isSelected}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: isSelected ? 'rgba(252,200,36,0.1)' : 'transparent',
                    color: isSelected ? T.amber : T.textMuted,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (isSelected) return;
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(144,144,168,0.08)';
                    el.style.color = T.textPrim;
                  }}
                  onMouseLeave={(e) => {
                    if (isSelected) return;
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'transparent';
                    el.style.color = T.textMuted;
                  }}
                >
                  {/* Project colour dot */}
                  <div
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      backgroundColor: project.color || T.blue,
                    }}
                  />
                  <Folder className="w-4 h-4" style={{ flexShrink: 0 }} aria-hidden="true" />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {project.name}
                  </span>
                  <span style={{ fontSize: 12, color: T.textDim, flexShrink: 0 }}>
                    {project.conversationCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ padding: '8px 12px' }}>
          <div
            style={{
              padding: 16,
              textAlign: 'center',
              color: T.textDim,
            }}
          >
            <FolderOpen
              className="w-8 h-8 mx-auto mb-2"
              style={{ opacity: 0.5 }}
              aria-hidden="true"
            />
            <p style={{ fontSize: 12 }}>No projects yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
