export const layerColors = {
  L1: {
    primary: '#3b82f6',
    bg: '#dbeafe',
    text: '#1e40af',
    border: '#3b82f6',
    badge: 'bg-blue-100 text-blue-800',
  },
  L2: {
    primary: '#22c55e',
    bg: '#dcfce7',
    text: '#166534',
    border: '#22c55e',
    badge: 'bg-green-100 text-green-800',
  },
  L3: {
    primary: '#a855f7',
    bg: '#f3e8ff',
    text: '#6b21a8',
    border: '#a855f7',
    badge: 'bg-purple-100 text-purple-800',
  },
};

export const categoryColors = [
  { name: 'amber', color: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  { name: 'red', color: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
  { name: 'blue', color: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
  { name: 'green', color: '#22c55e', bg: '#dcfce7', text: '#166534' },
  { name: 'purple', color: '#a855f7', bg: '#f3e8ff', text: '#6b21a8' },
  { name: 'pink', color: '#ec4899', bg: '#fce7f3', text: '#9f1239' },
  { name: 'teal', color: '#14b8a6', bg: '#ccfbf1', text: '#134e4a' },
  { name: 'orange', color: '#f97316', bg: '#ffedd5', text: '#9a3412' },
  { name: 'indigo', color: '#6366f1', bg: '#e0e7ff', text: '#3730a3' },
  { name: 'lime', color: '#84cc16', bg: '#ecfccb', text: '#365314' },
  { name: 'cyan', color: '#06b6d4', bg: '#cffafe', text: '#164e63' },
  { name: 'rose', color: '#f43f5e', bg: '#ffe4e6', text: '#9f1239' },
];

export function getCategoryColor(category: string): typeof categoryColors[0] {
  const index = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return categoryColors[index % categoryColors.length];
}
