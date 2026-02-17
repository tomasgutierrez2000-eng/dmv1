/* Layer colors – work on white/light background */
export const layerColors = {
  L1: {
    primary: '#2563eb',
    bg: '#eff6ff',
    text: '#1e40af',
    border: '#2563eb',
    badge: 'bg-blue-100 text-blue-800 border border-blue-200',
  },
  L2: {
    primary: '#059669',
    bg: '#ecfdf5',
    text: '#047857',
    border: '#059669',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
  L3: {
    primary: '#7c3aed',
    bg: '#f5f3ff',
    text: '#5b21b6',
    border: '#7c3aed',
    badge: 'bg-violet-100 text-violet-800 border border-violet-200',
  },
};

/* Category colors – distinct colors for each category on white background */
export const categoryColors = [
  { name: 'blue', color: '#2563eb', bg: '#eff6ff', text: '#1e40af' },
  { name: 'emerald', color: '#059669', bg: '#ecfdf5', text: '#047857' },
  { name: 'violet', color: '#7c3aed', bg: '#f5f3ff', text: '#5b21b6' },
  { name: 'amber', color: '#d97706', bg: '#fffbeb', text: '#b45309' },
  { name: 'rose', color: '#e11d48', bg: '#fff1f2', text: '#be123c' },
  { name: 'cyan', color: '#0891b2', bg: '#ecfeff', text: '#0e7490' },
  { name: 'indigo', color: '#4f46e5', bg: '#eef2ff', text: '#3730a3' },
  { name: 'teal', color: '#0d9488', bg: '#f0fdfa', text: '#0f766e' },
  { name: 'fuchsia', color: '#c026d3', bg: '#fdf4ff', text: '#a21caf' },
  { name: 'lime', color: '#65a30d', bg: '#f7fee7', text: '#4d7c0f' },
  { name: 'sky', color: '#0284c7', bg: '#f0f9ff', text: '#0369a1' },
  { name: 'orange', color: '#ea580c', bg: '#fff7ed', text: '#c2410c' },
];

export function getCategoryColor(category: string): (typeof categoryColors)[0] {
  const index = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return categoryColors[index % categoryColors.length];
}
