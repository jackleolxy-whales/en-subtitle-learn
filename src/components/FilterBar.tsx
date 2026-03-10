import type { FilterState, AccentFilter, GenderFilter, CategoryFilter, PMScenarioFilter } from '../types';
import { ArrowUpDown, Star, User, Globe, Tag, Briefcase } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => update({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-light text-sm text-text-secondary hover:text-text-primary transition-all hover-lift"
      >
        <ArrowUpDown className="w-4 h-4" />
        {filters.sortOrder === 'desc' ? '最新优先' : '最早优先'}
      </button>

      <DifficultyFilter
        value={filters.difficulty}
        onChange={(d) => update({ difficulty: d })}
      />

      <SelectFilter
        icon={<Briefcase className="w-4 h-4" />}
        value={filters.pmScenario}
        options={[
          { value: 'all', label: 'PM 场景' },
          { value: 'meeting', label: '会议' },
          { value: 'slack', label: '沟通' },
          { value: 'document', label: '文档' },
          { value: 'negotiation', label: '谈判' },
          { value: 'alignment', label: '对齐' },
          { value: 'pushback', label: '异议' },
        ]}
        onChange={(v) => update({ pmScenario: v as PMScenarioFilter })}
      />

      <SelectFilter
        icon={<User className="w-4 h-4" />}
        value={filters.gender}
        options={[
          { value: 'all', label: '全部' },
          { value: 'male', label: '男声' },
          { value: 'female', label: '女声' },
        ]}
        onChange={(v) => update({ gender: v as GenderFilter })}
      />

      <SelectFilter
        icon={<Globe className="w-4 h-4" />}
        value={filters.accent}
        options={[
          { value: 'all', label: '全部口音' },
          { value: 'American', label: '美音' },
          { value: 'British', label: '英音' },
        ]}
        onChange={(v) => update({ accent: v as AccentFilter })}
      />

      <SelectFilter
        icon={<Tag className="w-4 h-4" />}
        value={filters.category}
        options={[
          { value: 'all', label: '全部分类' },
          { value: '成长', label: '成长' },
          { value: '社交', label: '社交' },
          { value: '演讲', label: '演讲' },
          { value: '访谈', label: '访谈' },
          { value: 'YouTube', label: 'YouTube' },
        ]}
        onChange={(v) => update({ category: v as CategoryFilter })}
      />
    </div>
  );
}

function DifficultyFilter({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-4 py-2.5 rounded-xl glass-light transition-all hover-lift">
      <Star className="w-4 h-4 text-text-secondary" />
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={level}
          onClick={() => onChange(value === level ? null : level)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`w-4 h-4 transition-all ${
              value !== null && level <= value
                ? 'text-accent fill-accent drop-shadow-sm'
                : 'text-text-muted hover:text-accent/70'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function SelectFilter({
  icon,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-light transition-all hover-lift group">
      <span className="text-text-secondary group-hover:text-text-primary transition-colors">{icon}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm text-text-secondary group-hover:text-text-primary outline-none cursor-pointer appearance-none pr-4 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface text-text-primary">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
