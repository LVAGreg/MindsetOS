'use client';

import { useState, useEffect } from 'react';
import { Cpu, ChevronDown, Zap, DollarSign, Award } from 'lucide-react';

// ── Design tokens ──────────────────────────────────────────────
const T = {
  bgPage:    '#09090f',
  bgCard:    'rgba(18,18,31,0.8)',
  bgHeader:  'rgba(14,14,24,0.9)',
  bgHover:   'rgba(30,30,50,0.6)',
  bgSelected:'rgba(79,110,247,0.15)',
  border:    '#1e1e30',
  textPrimary: '#ededf5',
  textMuted:   '#9090a8',
  textDim:     '#5a5a72',
  blue:   '#4f6ef7',
  amber:  '#fcc824',
  purple: '#7c5bf6',
  green:  '#34c78a',
} as const;

interface AIModel {
  name: string;
  provider: string;
  ranking: number;
  tier: number;
  input_cost_per_1m: number;
  output_cost_per_1m: number;
  speed: string;
  quality: string;
  use_cases: string[];
  openrouter_id: string;
  description: string;
}

interface ComponentConfig {
  name: string;
  description: string;
  priority: string;
}

interface ModelSelectorProps {
  component: 'chat_agents' | 'memory_extraction' | 'memory_optimization';
  currentModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ModelSelector({ component, currentModel, onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<Record<string, AIModel>>({});
  const [componentInfo, setComponentInfo] = useState<ComponentConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<Array<[string, AIModel]>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/ai-models`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models);
        setComponentInfo(data.component_descriptions[component]);

        const filtered = Object.entries(data.models as Record<string, AIModel>).filter(([_, model]) =>
          model.use_cases.includes(component)
        );
        filtered.sort((a, b) => a[1].ranking - b[1].ranking);
        setAvailableModels(filtered);
      } else {
        setError('Failed to load models. Please try again.');
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setError('Could not reach the server. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModel = models[currentModel];

  const getTierColor = (tier: number): string => {
    switch (tier) {
      case 3: return T.purple;
      case 2: return T.blue;
      case 1: return T.green;
      default: return T.textMuted;
    }
  };

  const getTierBadge = (tier: number) => {
    switch (tier) {
      case 3: return '💵💵💵';
      case 2: return '💵💵';
      case 1: return '💵';
      default: return String(tier);
    }
  };

  const getSpeedIcon = (speed: string) => {
    if (speed === 'very-fast') return '🚀';
    if (speed === 'fast') return '⚡';
    if (speed === 'medium') return '🏃';
    return '🐢';
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return 'FREE';
    if (cost < 1) return `$${cost.toFixed(2)}`;
    return `$${cost.toFixed(2)}`;
  };

  return (
    <div className="relative">
      {/* Current Selection */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Select AI model for ${componentInfo?.name || component}`}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: T.bgCard,
          border: `1px solid ${isOpen ? T.blue : T.border}`,
          borderRadius: '8px',
          transition: 'border-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <Cpu
            aria-hidden="true"
            style={{ width: '20px', height: '20px', color: T.textMuted, flexShrink: 0 }}
          />
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontSize: '11px', color: T.textDim, marginBottom: '2px' }}>
              {componentInfo?.name || component}
            </div>
            {isLoading ? (
              <div style={{ fontSize: '14px', color: T.textMuted }}>Loading models…</div>
            ) : selectedModel ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, color: T.textPrimary }}>
                  {selectedModel.name}
                </span>
                <span style={{ fontSize: '12px', color: getTierColor(selectedModel.tier) }}>
                  #{selectedModel.ranking}
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: T.textDim }}>Select model…</div>
            )}
          </div>
        </div>
        <ChevronDown
          aria-hidden="true"
          style={{
            width: '16px',
            height: '16px',
            color: T.textDim,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            marginTop: '6px',
            padding: '8px 12px',
            background: 'rgba(220,38,38,0.12)',
            border: '1px solid rgba(220,38,38,0.35)',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#f87171',
          }}
        >
          {error}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: '8px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            zIndex: 50,
            maxHeight: '384px',
            overflowY: 'auto',
          }}
        >
          {/* Component Info header */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${T.border}`,
              background: T.bgHeader,
            }}
          >
            <div style={{ fontSize: '11px', color: T.textDim }}>
              {componentInfo?.description}
            </div>
          </div>

          {/* Model List */}
          <div style={{ paddingTop: '4px', paddingBottom: '4px' }}>
            {availableModels.map(([modelId, model]) => {
              const isSelected = modelId === currentModel;
              return (
                <button
                  key={modelId}
                  onClick={() => {
                    onModelChange(modelId);
                    setIsOpen(false);
                  }}
                  aria-pressed={isSelected}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: isSelected ? T.bgSelected : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.background = T.bgHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = isSelected ? T.bgSelected : 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {/* Ranking Badge */}
                    <div
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      #{model.ranking}
                    </div>

                    {/* Model Info */}
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: T.textPrimary }}>
                          {model.name}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: getTierColor(model.tier) }}>
                          {getTierBadge(model.tier)}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: T.textMuted, marginBottom: '8px' }}>
                        {model.description}
                      </div>

                      {/* Stats Row — flex-wrap for mobile */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '12px',
                        }}
                      >
                        {/* Speed */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span aria-hidden="true">{getSpeedIcon(model.speed)}</span>
                          <span style={{ color: T.textMuted, textTransform: 'capitalize' }}>
                            {model.speed.replace('-', ' ')}
                          </span>
                        </div>

                        {/* Input Cost */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <DollarSign
                            aria-hidden="true"
                            style={{ width: '12px', height: '12px', color: T.green }}
                          />
                          <span style={{ color: T.textMuted }}>
                            In: {formatCost(model.input_cost_per_1m)}/1M
                          </span>
                        </div>

                        {/* Output Cost */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <DollarSign
                            aria-hidden="true"
                            style={{ width: '12px', height: '12px', color: T.amber }}
                          />
                          <span style={{ color: T.textMuted }}>
                            Out: {formatCost(model.output_cost_per_1m)}/1M
                          </span>
                        </div>

                        {/* Quality */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Award
                            aria-hidden="true"
                            style={{ width: '12px', height: '12px', color: T.amber }}
                          />
                          <span style={{ color: T.textMuted, textTransform: 'capitalize' }}>
                            {model.quality}
                          </span>
                        </div>
                      </div>

                      {/* FREE Badge */}
                      {model.input_cost_per_1m === 0 && model.output_cost_per_1m === 0 && (
                        <div
                          style={{
                            marginTop: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            background: 'rgba(52,199,138,0.15)',
                            border: `1px solid rgba(52,199,138,0.35)`,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: T.green,
                          }}
                        >
                          <Zap aria-hidden="true" style={{ width: '12px', height: '12px' }} />
                          100% FREE
                        </div>
                      )}
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div style={{ flexShrink: 0 }}>
                        <div
                          aria-hidden="true"
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: T.blue,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
