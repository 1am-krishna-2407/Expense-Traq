import { useTheme } from '../../context/ThemeContext';

/** SVG attributes can't read CSS variables, so charts get concrete per-theme colours. */
export function useChartTheme() {
  const { theme } = useTheme();
  return theme === 'dark'
    ? {
        primary: '#3B82F6',
        primarySoft: '#1E3A8A',
        budget: '#334155',
        grid: '#1E293B',
        axis: '#64748B',
        tooltipBg: '#131C2E',
        tooltipBorder: '#334155',
        text: '#F8FAFC',
        muted: '#94A3B8',
        danger: '#EF4444',
        success: '#10B981',
      }
    : {
        primary: '#2563EB',
        primarySoft: '#DBE1FF',
        budget: '#C7D2FE',
        grid: '#E2E8F0',
        axis: '#737686',
        tooltipBg: '#0B1C30',
        tooltipBorder: '#0B1C30',
        text: '#FFFFFF',
        muted: '#CBD5E1',
        danger: '#DC2626',
        success: '#059669',
      };
}
