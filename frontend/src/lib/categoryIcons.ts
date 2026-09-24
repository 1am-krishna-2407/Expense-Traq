/**
 * Material Symbols glyph for a category, matched by keyword so user-created categories get
 * a sensible icon too (the designs show one icon per category).
 */
const RULES: [RegExp, string][] = [
  [/food|dining|restaurant|grocer|meal|swiggy|zomato/i, 'restaurant'],
  [/transport|travel|fuel|cab|uber|taxi|commute|petrol/i, 'directions_car'],
  [/util|bill|electric|water|internet|phone/i, 'bolt'],
  [/entertain|movie|leisure|fun|game|music/i, 'theaters'],
  [/health|medical|pharma|gym|fitness|wellness/i, 'medical_services'],
  [/shop|apparel|cloth|fashion|amazon/i, 'shopping_bag'],
  [/rent|home|house|housing/i, 'home'],
  [/educat|school|course|book|learn/i, 'school'],
  [/subscri/i, 'subscriptions'],
  [/pet/i, 'pets'],
  [/gift|donat|charity/i, 'redeem'],
  [/vacation|holiday|trip|flight/i, 'flight'],
  [/insur/i, 'shield'],
  [/invest|saving/i, 'savings'],
];

export function categoryIcon(name: string): string {
  return RULES.find(([re]) => re.test(name))?.[1] ?? 'category';
}

/** Palette offered in the category colour picker (from both design systems). */
export const CATEGORY_COLORS = [
  '#2563EB', '#3B82F6', '#10B981', '#059669', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#64748B', '#F97316', '#94A3B8',
];

export const FALLBACK_COLOR = '#94A3B8';
export const colorOf = (color: string | null | undefined) => color ?? FALLBACK_COLOR;
