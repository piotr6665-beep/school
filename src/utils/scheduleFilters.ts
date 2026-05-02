// Helpers for filtering and categorising class schedules in the public schedule page.

export type AgeBucket = 'all' | 'kids' | 'teens' | 'adults';
export type LevelBucket = 'all' | 'Początkujący' | 'Średniozaawansowany' | 'Zaawansowany' | 'Kontynuacja' | 'Wszystkie poziomy';
export type TypeBucket = 'all' | 'hoop' | 'silk' | 'acro' | 'stretch' | 'handstand' | 'other';

export const TYPE_LABEL_KEY: Record<Exclude<TypeBucket, 'all'>, string> = {
  hoop: 'schedule.typeHoop',
  silk: 'schedule.typeSilk',
  acro: 'schedule.typeAcro',
  stretch: 'schedule.typeStretch',
  handstand: 'schedule.typeHandstand',
  other: 'schedule.typeOther',
};

export function detectType(name: string): Exclude<TypeBucket, 'all'> {
  const n = name.toLowerCase();
  if (n.includes('koł') || n.includes('hoop')) return 'hoop';
  if (n.includes('szarf') || n.includes('silk')) return 'silk';
  if (n.includes('handstand')) return 'handstand';
  if (n.includes('stretch')) return 'stretch';
  if (n.includes('akrobat') || n.includes('acro')) return 'acro';
  return 'other';
}

export function detectAgeBucket(age: string): Exclude<AgeBucket, 'all'> {
  const a = age.toLowerCase();
  // Try to read first numeric range start
  const m = a.match(/(\d+)\s*[-–]/);
  if (m) {
    const start = parseInt(m[1], 10);
    if (start <= 9) return 'kids';
    if (start <= 14) return 'teens';
    return 'adults';
  }
  if (a.includes('doros') || a.includes('15+') || a.includes('adult')) return 'adults';
  if (a.includes('mini')) return 'kids';
  return 'adults';
}

export interface MinimalSchedule {
  name: string;
  age: string;
  level: string;
}

export interface ScheduleFilters {
  search: string;
  age: AgeBucket;
  level: LevelBucket;
  type: TypeBucket;
}

export function matchesFilters<T extends MinimalSchedule>(s: T, f: ScheduleFilters): boolean {
  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    if (!s.name.toLowerCase().includes(q) && !s.level.toLowerCase().includes(q) && !s.age.toLowerCase().includes(q)) {
      return false;
    }
  }
  if (f.age !== 'all' && detectAgeBucket(s.age) !== f.age) return false;
  if (f.level !== 'all' && s.level !== f.level) return false;
  if (f.type !== 'all' && detectType(s.name) !== f.type) return false;
  return true;
}
