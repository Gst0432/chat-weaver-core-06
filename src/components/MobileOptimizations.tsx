import { useEffect } from 'react';
import { useMobileNative } from '@/hooks/use-mobile-native';

const MobileOptimizations = () => {
  const { isNative } = useMobileNative();

  useEffect(() => {
    // Disable zoom on double tap for mobile
    let lastTouchEnd = 0;
    const preventDefault = (e: TouchEvent) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    if (isNative || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      document.addEventListener('touchend', preventDefault, { passive: false });
      
      // Add mobile class to body
      document.body.classList.add('mobile-optimized');
      
      // Prevent overscroll bounce
      document.body.style.overscrollBehavior = 'none';
    }

    return () => {
      document.removeEventListener('touchend', preventDefault);
    };
  }, [isNative]);

  return null;
};

export default MobileOptimizations;