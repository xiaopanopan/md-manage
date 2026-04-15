import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useAppStore';

type ResolvedTheme = 'light' | 'dark';

/**
 * 返回当前实际生效的主题（已解析 'auto'）
 * 并在系统偏好变化时自动更新
 */
export function useSystemTheme(): ResolvedTheme {
  const theme = useTheme();
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (theme === 'auto') return systemDark ? 'dark' : 'light';
  return theme;
}
