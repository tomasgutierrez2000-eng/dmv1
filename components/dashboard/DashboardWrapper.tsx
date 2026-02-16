'use client';

import { useEffect } from 'react';

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Override body styles for dashboard
    const originalBg = document.body.style.backgroundColor;
    const originalColor = document.body.style.color;
    const originalClass = document.body.className;
    
    document.body.style.backgroundColor = '#f9fafb';
    document.body.style.color = '#111827';
    document.body.classList.add('dashboard-active');
    
    return () => {
      // Restore original styles when leaving dashboard
      document.body.style.backgroundColor = originalBg;
      document.body.style.color = originalColor;
      document.body.classList.remove('dashboard-active');
    };
  }, []);

  return <>{children}</>;
}
