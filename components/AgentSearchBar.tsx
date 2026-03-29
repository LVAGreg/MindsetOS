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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search agents..."
          className="w-full pl-11 pr-11 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 dark:focus:border-amber-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-colors"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                active
                  ? 'bg-amber-400 text-black border-amber-400 shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 hover:text-gray-900 dark:hover:text-white'
              }`}
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
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {activeFilters.length} filter{activeFilters.length > 1 ? 's' : ''} active
          </span>
          <button
            onClick={() => onFilterChange([])}
            className="text-xs text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 font-medium transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
