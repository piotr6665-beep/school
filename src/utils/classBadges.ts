// Class badge metadata.
// Source of truth: the `badge` column on `class_schedules` (set by admins).
// Legacy fallback: detect "(NOWOŚĆ)" / "(POLECANE)" markers embedded in the name
// for old data that hasn't been migrated to the column yet.

export type BadgeKind = 'new' | 'recommended';

export interface ClassNameMeta {
  cleanName: string;
  badges: BadgeKind[];
}

const NEW_REGEX = /\(?\s*(NOWOŚĆ|NEW)\s*\)?/giu;
const RECO_REGEX = /\(?\s*(POLECANE|RECOMMENDED|HIT)\s*\)?/giu;

/**
 * Parse a class name and return cleaned name + visual badges.
 *
 * @param name  Raw class name from `class_schedules.name`.
 * @param badge Optional admin-controlled flag from `class_schedules.badge`
 *              ("new" | "recommended" | null). When provided it takes precedence
 *              over legacy markers detected in the name.
 */
export function parseClassName(name: string, badge?: string | null): ClassNameMeta {
  const badges: BadgeKind[] = [];
  let cleanName = name;

  // Always strip legacy markers from the displayed name so the title looks clean.
  const hasLegacyNew = NEW_REGEX.test(cleanName);
  cleanName = cleanName.replace(NEW_REGEX, '').trim();

  const hasLegacyReco = RECO_REGEX.test(cleanName);
  cleanName = cleanName.replace(RECO_REGEX, '').trim();

  // Collapse double spaces / dangling separators
  cleanName = cleanName.replace(/\s{2,}/g, ' ').replace(/[\s,–-]+$/u, '').trim();

  // Admin flag wins. Otherwise fall back to legacy markers.
  if (badge === 'new' || badge === 'recommended') {
    badges.push(badge);
  } else {
    if (hasLegacyNew) badges.push('new');
    if (hasLegacyReco) badges.push('recommended');
  }

  return { cleanName: cleanName || name, badges };
}
