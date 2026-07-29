import React, { useState, useEffect } from 'react';
import { getCachedImageUrl } from '../utils/imageCache';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({ src, alt = '', className, onClick, ...rest }) => {
  const [displaySrc, setDisplaySrc] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (!src) {
      setDisplaySrc('');
      return;
    }

    getCachedImageUrl(src).then((cachedUrl) => {
      if (isMounted) {
        setDisplaySrc(cachedUrl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!displaySrc) {
    return <div className={`animate-pulse bg-slate-200 rounded-lg ${className || 'w-full h-full'}`} />;
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onClick={onClick}
      {...rest}
    />
  );
};
