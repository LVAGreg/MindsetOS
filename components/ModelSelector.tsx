'use client';

import { useState, useEffect } from 'react';
import { Cpu, Settings, ChevronDown, Zap, DollarSign, Award } from 'lucide-react';

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

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/ai-models`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models);
        setComponentInfo(data.component_descriptions[component]);

        // Filter models that support this component
        const filtered = Object.entries(data.models as Record<string, AIModel>).filter(([_, model]) =>
          model.use_cases.includes(component)
        );

        // Sort by ranking
        filtered.sort((a, b) => a[1].ranking - b[1].ranking);
        setAvailableModels(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const selectedModel = models[currentModel];

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 3: return 'text-purple-600 dark:text-purple-400';
      case 2: return 'text-blue-600 dark:text-blue-400';
      case 1: return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
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
        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-3 flex-1">
          <Cpu className="w-5 h-5 text-gray-500" />
          <div className="text-left flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              {componentInfo?.name || component}
            </div>
            {selectedModel ? (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedModel.name}
                </span>
                <span className={`text-xs ${getTierColor(selectedModel.tier)}`}>
                  #{selectedModel.ranking}
                </span>
              </div>
            ) : (
              <div className="text-sm text-gray-400">Select model...</div>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
          {/* Component Info */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {componentInfo?.description}
            </div>
          </div>

          {/* Model List */}
          <div className="py-2">
            {availableModels.map(([modelId, model]) => (
              <button
                key={modelId}
                onClick={() => {
                  onModelChange(modelId);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  modelId === currentModel ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Ranking Badge */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    #{model.ranking}
                  </div>

                  {/* Model Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {model.name}
                      </span>
                      <span className={`text-xs font-medium ${getTierColor(model.tier)}`}>
                        {getTierBadge(model.tier)}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {model.description}
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-xs">
                      {/* Speed */}
                      <div className="flex items-center gap-1">
                        <span>{getSpeedIcon(model.speed)}</span>
                        <span className="text-gray-600 dark:text-gray-400 capitalize">
                          {model.speed.replace('-', ' ')}
                        </span>
                      </div>

                      {/* Input Cost */}
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span className="text-gray-600 dark:text-gray-400">
                          In: {formatCost(model.input_cost_per_1m)}/1M
                        </span>
                      </div>

                      {/* Output Cost */}
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-orange-600" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Out: {formatCost(model.output_cost_per_1m)}/1M
                        </span>
                      </div>

                      {/* Quality */}
                      <div className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-yellow-600" />
                        <span className="text-gray-600 dark:text-gray-400 capitalize">
                          {model.quality}
                        </span>
                      </div>
                    </div>

                    {/* FREE Badge */}
                    {model.input_cost_per_1m === 0 && model.output_cost_per_1m === 0 && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-semibold">
                        <Zap className="w-3 h-3" />
                        100% FREE
                      </div>
                    )}
                  </div>

                  {/* Selected Indicator */}
                  {modelId === currentModel && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
