import type { RefObject } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  SortAsc,
  X,
} from 'lucide-react';
import type { BucketAllocation } from '@/domain/plan';
import type { MultiSelectOption } from '@/components/forms/multi-select';
import { MultiSelect } from '@/components/forms/multi-select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CATEGORY_LABELS, FREQUENCY_LABELS } from '@/lib/constants';
import { DatePickerButton } from './date-picker-button';
import { FilterChip } from './filter-chip';
import { formatTransactionDate } from '../utils/date-utils';
import type { ExpenseFiltersState, SortField } from '../types';

interface ExpensesFilterPanelProps {
  expensesCount: number;
  buckets: BucketAllocation[];
  filters: ExpenseFiltersState;
  setFilters: (updates: Partial<ExpenseFiltersState>) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  debouncedSearch: string;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  filtersExpanded: boolean;
  onFiltersExpandedChange: (open: boolean) => void;
  categoryOptions: MultiSelectOption[];
  bucketOptions: MultiSelectOption[];
  bucketMap: Map<string, BucketAllocation>;
  sortOptions: { value: SortField; label: string }[];
  clearAllFilters: () => void;
  clearSearch: () => void;
  clearCategories: () => void;
  clearBuckets: () => void;
  clearFrequency: () => void;
  clearFixed: () => void;
  clearAmountRange: () => void;
  clearDateRange: () => void;
}

export function ExpensesFilterPanel({
  expensesCount,
  buckets,
  filters,
  setFilters,
  searchInputRef,
  debouncedSearch,
  activeFilterCount,
  hasActiveFilters,
  filtersExpanded,
  onFiltersExpandedChange,
  categoryOptions,
  bucketOptions,
  bucketMap,
  sortOptions,
  clearAllFilters,
  clearSearch,
  clearCategories,
  clearBuckets,
  clearFrequency,
  clearFixed,
  clearAmountRange,
  clearDateRange,
}: ExpensesFilterPanelProps) {
  if (expensesCount === 0) return null;

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Search expenses by name, notes, category, or bucket…"
            name="expenseSearch"
            autoComplete="off"
            value={filters.q}
            onChange={(e) => setFilters({ q: e.target.value })}
            className="pl-9 pr-9"
            aria-label="Search expenses"
          />
          {filters.q && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <Collapsible
          open={filtersExpanded}
          onOpenChange={onFiltersExpandedChange}
        >
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1">
                <Filter className="size-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                    {activeFilterCount}
                  </Badge>
                )}
                {filtersExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <SortAsc className="text-muted-foreground size-4 shrink-0" />
                <Select
                  value={filters.sort}
                  onValueChange={(val) => setFilters({ sort: val })}
                >
                  <SelectTrigger className="h-8 w-[140px]" aria-label="Sort by">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-8"
                >
                  <X className="size-3" />
                  Clear all
                </Button>
              )}
            </div>
          </div>

          <CollapsibleContent className="pt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Categories
                </Label>
                <MultiSelect
                  options={categoryOptions}
                  value={filters.categories}
                  onChange={(val) => setFilters({ categories: val })}
                  placeholder="All categories"
                  ariaLabel="Filter by categories"
                />
              </div>

              {buckets.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Buckets
                  </Label>
                  <MultiSelect
                    options={bucketOptions}
                    value={filters.buckets}
                    onChange={(val) => setFilters({ buckets: val })}
                    placeholder="All buckets"
                    ariaLabel="Filter by buckets"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Frequency
                </Label>
                <Select
                  value={filters.frequency}
                  onValueChange={(val) =>
                    setFilters({
                      frequency: val === 'all' ? '' : val,
                    })
                  }
                >
                  <SelectTrigger
                    className="h-8 w-[140px]"
                    aria-label="Filter by frequency"
                  >
                    <SelectValue placeholder="All frequencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All frequencies</SelectItem>
                    {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Type</Label>
                <Select
                  value={filters.fixed}
                  onValueChange={(val) =>
                    setFilters({ fixed: val === 'all' ? '' : val })
                  }
                >
                  <SelectTrigger
                    className="h-8 w-[120px]"
                    aria-label="Filter by expense type"
                  >
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="true">Fixed</SelectItem>
                    <SelectItem value="false">Variable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Amount range (monthly)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    min={0}
                    value={filters.minAmount || ''}
                    onChange={(e) =>
                      setFilters({
                        minAmount: e.target.value
                          ? parseInt(e.target.value, 10)
                          : 0,
                      })
                    }
                    className="h-8 w-20"
                    aria-label="Minimum amount"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    min={0}
                    value={filters.maxAmount || ''}
                    onChange={(e) =>
                      setFilters({
                        maxAmount: e.target.value
                          ? parseInt(e.target.value, 10)
                          : 0,
                      })
                    }
                    className="h-8 w-20"
                    aria-label="Maximum amount"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Date range
                </Label>
                <div className="flex items-center gap-2">
                  <DatePickerButton
                    value={filters.dateFrom}
                    onChange={(val) => setFilters({ dateFrom: val })}
                    placeholder="From"
                    ariaLabel="Filter from date"
                  />
                  <span className="text-muted-foreground">-</span>
                  <DatePickerButton
                    value={filters.dateTo}
                    onChange={(val) => setFilters({ dateTo: val })}
                    placeholder="To"
                    ariaLabel="Filter to date"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {debouncedSearch.trim() && (
              <FilterChip
                label={`Search: "${debouncedSearch}"`}
                onClear={clearSearch}
              />
            )}
            {filters.categories.length > 0 && (
              <FilterChip
                label={`Categories: ${filters.categories
                  .map(
                    (c) =>
                      CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c,
                  )
                  .join(', ')}`}
                onClear={clearCategories}
              />
            )}
            {filters.buckets.length > 0 && (
              <FilterChip
                label={`Buckets: ${filters.buckets
                  .map((id) => bucketMap.get(id)?.name ?? id)
                  .join(', ')}`}
                onClear={clearBuckets}
              />
            )}
            {filters.frequency && (
              <FilterChip
                label={`Frequency: ${FREQUENCY_LABELS[filters.frequency as keyof typeof FREQUENCY_LABELS] ?? filters.frequency}`}
                onClear={clearFrequency}
              />
            )}
            {filters.fixed && (
              <FilterChip
                label={
                  filters.fixed === 'true' ? 'Fixed only' : 'Variable only'
                }
                onClear={clearFixed}
              />
            )}
            {(filters.minAmount > 0 || filters.maxAmount > 0) && (
              <FilterChip
                label={`Amount: ${filters.minAmount > 0 ? `$${filters.minAmount}` : '$0'} - ${filters.maxAmount > 0 ? `$${filters.maxAmount}` : 'any'}`}
                onClear={clearAmountRange}
              />
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <FilterChip
                label={`Date: ${filters.dateFrom ? formatTransactionDate(filters.dateFrom) : 'any'} - ${filters.dateTo ? formatTransactionDate(filters.dateTo) : 'any'}`}
                onClear={clearDateRange}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
