// src/frontend/components/search/SearchComponent.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { debounce } from 'lodash';

// Types
export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: string | number | boolean | string[] | number[] | [number, number];
  label?: string;
}

export interface SearchField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  operators: ('equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in')[];
  options?: { value: string; label: string }[]; // For select/multiselect types
}

export interface SearchConfig {
  entityType: string;
  fields: SearchField[];
}

export interface SearchResult<T> {
  results: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Components
interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onAdvancedSearch?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  value,
  onChange,
  onSearch,
  onClear,
  onAdvancedSearch
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    } else if (e.key === 'Escape') {
      onClear();
    }
  };

  return (
    <div className="relative flex w-full items-center">
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="block w-full pl-10 pr-20 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder={placeholder}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
      
      <div className="ml-2 flex space-x-2">
        <Button
          variant="primary"
          onClick={onSearch}
        >
          Search
        </Button>
        
        {onAdvancedSearch && (
          <Button
            variant="outline"
            onClick={onAdvancedSearch}
          >
            Advanced
          </Button>
        )}
      </div>
    </div>
  );
};

interface FilterItemProps {
  filter: SearchFilter;
  fields: SearchField[];
  onUpdate: (filter: SearchFilter) => void;
  onRemove: () => void;
}

const FilterItem: React.FC<FilterItemProps> = ({
  filter,
  fields,
  onUpdate,
  onRemove
}) => {
  // Find the selected field
  const selectedField = fields.find(f => f.id === filter.field);
  
  // Handle field change
  const handleFieldChange = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      // Reset operator and value when field changes
      onUpdate({
        field: fieldId,
        operator: field.operators[0],
        value: field.type === 'select' && field.options ? field.options[0].value : ''
      });
    }
  };
  
  // Handle operator change
  const handleOperatorChange = (operator: string) => {
    onUpdate({
      ...filter,
      operator: operator as SearchFilter['operator'],
      // Reset value if switching to or from 'between' or 'in'
      value: operator === 'between' ? [0, 0] : 
             operator === 'in' ? [] : 
             typeof filter.value === 'object' ? '' : filter.value
    });
  };
  
  // Handle value change for text, number, date
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onUpdate({
      ...filter,
      value: event.target.value
    });
  };
  
  // Handle value change for range (between)
  const handleRangeValueChange = (index: number, value: number) => {
    if (Array.isArray(filter.value) && filter.value.length === 2) {
      const newValue = [...filter.value] as [number, number];
      newValue[index] = value;
      onUpdate({
        ...filter,
        value: newValue
      });
    }
  };
  
  // Handle select multiple values (in)
  const handleMultiSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const options = event.target.options;
    const values = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        values.push(options[i].value);
      }
    }
    onUpdate({
      ...filter,
      value: values
    });
  };
  
  // Render value input based on field type and operator
  const renderValueInput = () => {
    if (!selectedField) return null;
    
    if (filter.operator === 'between' && (selectedField.type === 'number' || selectedField.type === 'date')) {
      const values = Array.isArray(filter.value) ? filter.value : [0, 0];
      return (
        <div className="flex space-x-2 items-center">
          <input
            type={selectedField.type}
            value={values[0]}
            onChange={(e) => handleRangeValueChange(0, Number(e.target.value))}
            className="w-24 block pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <span>and</span>
          <input
            type={selectedField.type}
            value={values[1]}
            onChange={(e) => handleRangeValueChange(1, Number(e.target.value))}
            className="w-24 block pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      );
    }
    
    if (filter.operator === 'in' && selectedField.type === 'select' && selectedField.options) {
      return (
        <select
          multiple
          value={Array.isArray(filter.value) ? filter.value as string[] : []}
          onChange={handleMultiSelectChange}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          {selectedField.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    
    if (selectedField.type === 'select' && selectedField.options) {
      return (
        <select
          value={filter.value as string}
          onChange={handleValueChange}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          {selectedField.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    
    if (selectedField.type === 'boolean') {
      return (
        <select
          value={filter.value.toString()}
          onChange={handleValueChange}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    
    return (
      <input
        type={selectedField.type}
        value={filter.value as string}
        onChange={handleValueChange}
        className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
    );
  };
  
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 border border-gray-200 rounded-md bg-gray-50">
      <div className="flex-grow-0">
        <select
          value={filter.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          {fields.map(field => (
            <option key={field.id} value={field.id}>
              {field.label}
            </option>
          ))}
        </select>
      </div>
      
      {selectedField && (
        <div className="flex-grow-0">
          <select
            value={filter.operator}
            onChange={(e) => handleOperatorChange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {selectedField.operators.map(op => (
              <option key={op} value={op}>
                {op === 'equals' ? 'equals' :
                 op === 'contains' ? 'contains' :
                 op === 'startsWith' ? 'starts with' :
                 op === 'endsWith' ? 'ends with' :
                 op === 'greaterThan' ? 'greater than' :
                 op === 'lessThan' ? 'less than' :
                 op === 'between' ? 'between' :
                 op === 'in' ? 'is one of' : op}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="flex-grow">{renderValueInput()}</div>
      
      <div className="flex-shrink-0">
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

interface AdvancedSearchProps {
  config: SearchConfig;
  filters: SearchFilter[];
  onUpdateFilters: (filters: SearchFilter[]) => void;
  onSearch: () => void;
  onClose: () => void;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  config,
  filters,
  onUpdateFilters,
  onSearch,
  onClose
}) => {
  // Add a new filter
  const handleAddFilter = () => {
    // Get the first available field
    const firstField = config.fields[0];
    const newFilter: SearchFilter = {
      field: firstField.id,
      operator: firstField.operators[0],
      value: firstField.type === 'select' && firstField.options ? firstField.options[0].value : ''
    };
    
    onUpdateFilters([...filters, newFilter]);
  };
  
  // Update a specific filter
  const handleUpdateFilter = (index: number, updatedFilter: SearchFilter) => {
    const newFilters = [...filters];
    newFilters[index] = updatedFilter;
    onUpdateFilters(newFilters);
  };
  
  // Remove a filter
  const handleRemoveFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    onUpdateFilters(newFilters);
  };
  
  // Reset all filters
  const handleResetFilters = () => {
    onUpdateFilters([]);
  };
  
  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Advanced Search</h2>
        <Button
          variant="outline"
          size="small"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
      
      <div className="space-y-3 mb-4">
        {filters.map((filter, index) => (
          <FilterItem
            key={index}
            filter={filter}
            fields={config.fields}
            onUpdate={(updatedFilter) => handleUpdateFilter(index, updatedFilter)}
            onRemove={() => handleRemoveFilter(index)}
          />
        ))}
        
        {filters.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No filters added. Click "Add Filter" to start building your search query.
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={handleAddFilter}
        >
          Add Filter
        </Button>
        
        {filters.length > 0 && (
          <Button
            variant="outline"
            onClick={handleResetFilters}
          >
            Reset Filters
          </Button>
        )}
        
        <div className="ml-auto">
          <Button
            variant="primary"
            onClick={onSearch}
            disabled={filters.length === 0}
          >
            Search
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Main Search Component
interface SearchComponentProps<T> {
  config: SearchConfig;
  placeholder?: string;
  initialFilters?: SearchFilter[];
  onSearch: (query: string, filters: SearchFilter[], page: number, pageSize: number) => Promise<SearchResult<T>>;
  renderResult: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onSelectItem?: (item: T) => void;
}

export function SearchComponent<T>({
  config,
  placeholder,
  initialFilters = [],
  onSearch,
  renderResult,
  keyExtractor,
  onSelectItem
}: SearchComponentProps<T>) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter[]>(initialFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult<T> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilter[], currentPage: number, size: number) => {
      setIsSearching(true);
      try {
        const results = await onSearch(searchQuery, searchFilters, currentPage, size);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [onSearch]
  );
  
  // Handle search
  const handleSearch = useCallback(() => {
    debouncedSearch(query, filters, page, pageSize);
  }, [query, filters, page, pageSize, debouncedSearch]);
  
  // Clear search
  const handleClear = () => {
    setQuery('');
    setSearchResults(null);
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // Search when filters, query, or page changes
  useEffect(() => {
    if (query || filters.length > 0) {
      handleSearch();
    } else if (searchResults) {
      setSearchResults(null);
    }
  }, [query, filters, page, handleSearch, searchResults]);
  
  return (
    <div className="space-y-4">
      <SearchBar
        placeholder={placeholder}
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        onClear={handleClear}
        onAdvancedSearch={() => setShowAdvanced(!showAdvanced)}
      />
      
      {showAdvanced && (
        <AdvancedSearch
          config={config}
          filters={filters}
          onUpdateFilters={setFilters}
          onSearch={handleSearch}
          onClose={() => setShowAdvanced(false)}
        />
      )}
      
      {isSearching && (
        <div className="flex justify-center py-4">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      
      {searchResults && !isSearching && (
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-medium">
              Results ({searchResults.totalCount})
            </h3>
          </div>
          
          {searchResults.results.length > 0 ? (
            <div className="space-y-4">
              <div className="divide-y">
                {searchResults.results.map(item => (
                  <div 
                    key={keyExtractor(item)} 
                    className={`py-4 ${onSelectItem ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => onSelectItem && onSelectItem(item)}
                  >
                    {renderResult(item)}
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {searchResults.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(searchResults.page - 1) * searchResults.pageSize + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(searchResults.page * searchResults.pageSize, searchResults.totalCount)}
                    </span>{' '}
                    of <span className="font-medium">{searchResults.totalCount}</span> results
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === searchResults.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No results found.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// Example usage:
/*
import { SearchComponent, SearchFilter, SearchConfig } from './SearchComponent';

// Define your search configuration
const searchConfig: SearchConfig = {
  entityType: 'trainee',
  fields: [
    {
      id: 'name',
      label: 'Name',
      type: 'text',
      operators: ['contains', 'equals', 'startsWith']
    },
    {
      id: 'email',
      label: 'Email',
      type: 'text',
      operators: ['contains', 'equals', 'endsWith']
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      operators: ['equals', 'in'],
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'on_leave', label: 'On Leave' }
      ]
    },
    {
      id: 'progress',
      label: 'Progress',
      type: 'number',
      operators: ['equals', 'greaterThan', 'lessThan', 'between']
    },
    {
      id: 'enrollmentDate',
      label: 'Enrollment Date',
      type: 'date',
      operators: ['equals', 'greaterThan', 'lessThan', 'between']
    }
  ]
};

// Your component
function TraineeSearch() {
  const handleSearch = async (
    query: string, 
    filters: SearchFilter[], 
    page: number, 
    pageSize: number
  ) => {
    // Call your API here
    // Return a SearchResult object
    return {
      results: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0
    };
  };

  return (
    <SearchComponent
      config={searchConfig}
      placeholder="Search trainees..."
      onSearch={handleSearch}
      renderResult={(trainee) => (
        <div>
          <div className="font-medium">{trainee.name}</div>
          <div className="text-sm text-gray-500">{trainee.email}</div>
        </div>
      )}
      keyExtractor={(trainee) => trainee.id}
      onSelectItem={(trainee) => {
        // Handle trainee selection
      }}
    />
  );
}
*/