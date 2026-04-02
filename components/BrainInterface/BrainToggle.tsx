'use client';
import { Brain, Network } from 'lucide-react';

export type BrainVariant = 'A' | 'B';

interface Props {
  active: BrainVariant;
  onChange: (v: BrainVariant) => void;
}

export default function BrainToggle({ active, onChange }: Props) {
  const buttons: { variant: BrainVariant; icon: React.ReactNode; label: string }[] = [
    { variant: 'A', icon: <Network size={12} />, label: 'Synaptic Web' },
    { variant: 'B', icon: <Brain size={12} />,   label: 'Brain Atlas'  },
  ];

  return (
    <div className="flex items-center gap-2 justify-center">
      {buttons.map(({ variant, icon, label }) => {
        const isActive = active === variant;
        return (
          <button
            key={variant}
            onClick={() => onChange(variant)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              isActive
                ? {
                    background: 'rgba(79,110,247,0.15)',
                    border: '1px solid rgba(79,110,247,0.35)',
                    color: '#7b92ff',
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#5a5a72',
                  }
            }
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
