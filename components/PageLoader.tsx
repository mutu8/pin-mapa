'use client';

import { useEffect, useState } from 'react';

export default function PageLoader() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Fade out después de 2.5 segundos (similar al repo FiveM)
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className="loader_bg"
      style={{
        transition: 'opacity 0.5s ease-out',
        opacity: isVisible ? 1 : 0
      }}
    >
      <div className="loader"></div>
    </div>
  );
}
