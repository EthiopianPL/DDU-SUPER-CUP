// src/app/hooks/usePullToRefresh.ts
import { useState, useEffect } from 'react';

export function usePullToRefresh(onRefresh: () => void) {
  const [startY, setStartY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let touchStart = 0;
    let touchEnd = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStart = e.touches[0].clientY;
      setStartY(touchStart);
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEnd = e.touches[0].clientY;
      const diff = touchEnd - touchStart;
      
      if (diff > 100 && window.scrollY === 0 && !refreshing) {
        setRefreshing(true);
        onRefresh();
        setTimeout(() => setRefreshing(false), 1000);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [onRefresh, refreshing]);

  return { refreshing };
}