'use client';

import { Search, X, TrendingUp, Sparkles, Target, Zap, FileText, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface AgentSearchBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: string[]) => void;
  activeFilters: string[];
}

const filterOptions = [
  { id: 'all', label: 'All Agents', icon: null },
  { id: 'popular', label: 'Popular', icon: TrendingUp },
  { id: 'new', label: 'New', icon: Sparkles },
  { id: 'workflow', label: 'Workflow', icon: Target },
  { id: 'quick-win', label: 'Quick Win', icon: Zap },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'lead-gen', label: 'Lead Gen', icon: UserPlus },
];

export default function AgentSearchBar({
  onSearch,
  onFilterChange,
  activeFilters
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
      ? activeFilters.filter(f => f !== filterId)
      : [...activeFilters, filterId];

    onFilterChange(newFilters);
  };

  const isActive = (filterId: string) => {
    if (filterId === 'all') {
      return activeFilters.length === 0;
    }
    return activeFilters.includes(filterId);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search agents by name or description..."
          className="w-full pl-12 pr-12 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-base"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((filter) => {
          const Icon = filter.icon;
          const active = isActive(filter.id);

          return (
            <button
              key={filter.id}
              onClick={() => toggleFilter(filter.id)}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${active
                  ? 'bg-[#ffc82c] text-black shadow-md scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-[#ffc82c] hover:scale-105'
                }
              `}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Active Filters Count */}
      {activeFilters.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {activeFilters.length} filter{activeFilters.length > 1 ? 's' : ''} active
          </span>
          <button
            onClick={() => onFilterChange([])}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#ffc82c] dark:hover:text-[#ffc82c] font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
