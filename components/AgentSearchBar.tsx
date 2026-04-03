'use client';

import { Search, X, Brain, Target, Compass, RefreshCcw, Calendar, Radio, Rocket } from 'lucide-react';
import { useState } from 'react';

interface AgentSearchBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: string[]) => void;
  activeFilters: string[];
}

const filterOptions = [
  { id: 'all', label: 'All', icon: null },
  { id: 'assessment', label: 'Assessment', icon: Brain },
  { id: 'coaching', label: 'Coaching', icon: Target },
  { id: 'self-awareness', label: 'Self-Awareness', icon: Compass },
  { id: 'strategy', label: 'Strategy', icon: RefreshCcw },
  { id: 'accountability', label: 'Accountability', icon: Calendar },
  { id: 'content', label: 'Content', icon: Radio },
  { id: 'admin', label: 'Admin', icon: Rocket },
];

export default function AgentSearchBar({
  onSearch,
  onFilterChange,
  activeFilters,
}: AgentSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  const toggleFilter = (filterId: string) => {
    if (filterId === 'all') {
      onFilterChange([]);
      return;
    }
    const newFilters = activeFilters.includes(filterId)
      ? activeFilters.filter((f) => f !== filterId)
      : [...activeFilters, filterId];
    onFilterChange(newFilters);
  };

  const isActive = (filterId: string) => {
    if (filterId === 'all') return activeFilters.length === 0;
    return activeFilters.includes(filterId);
  };

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: '#9090a8' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search agents..."
          className="w-full pl-11 pr-11 py-3 rounded-xl text-sm transition-colors focus:outline-none"
          style={{
            background: 'rgba(18,18,31,0.8)',
            border: '2px solid #1e1e30',
            color: '#ededf5',
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = '#fcc824';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = '#1e1e30';
          }}
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
            style={{ color: '#9090a8' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((filter) => {
          const Icon = filter.icon;
          const active = isActive(filter.id);

          return (
            <button
              key={filter.id}
              onClick={() => toggleFilter(filter.id)}
              aria-pressed={active}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
              style={
                active
                  ? {
                      background: '#fcc824',
                      color: '#09090f',
                      border: '1px solid #fcc824',
                    }
                  : {
                      background: 'rgba(18,18,31,0.8)',
                      color: '#9090a8',
                      border: '1px solid #1e1e30',
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.borderColor = '#fcc824';
                  (e.currentTarget as HTMLElement).style.color = '#ededf5';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30';
                  (e.currentTarget as HTMLElement).style.color = '#9090a8';
                }
              }}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Active filter summary */}
      {activeFilters.length > 0 && (
        <div className="flex items-center justify-between">
          <span
            className="text-xs"
            style={{ color: '#5a5a72' }}
          >
            {activeFilters.length} filter{activeFilters.length > 1 ? 's' : ''} active
          </span>
          <button
            onClick={() => onFilterChange([])}
            className="text-xs font-medium transition-colors"
            style={{ color: '#9090a8' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#fcc824';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#9090a8';
            }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
