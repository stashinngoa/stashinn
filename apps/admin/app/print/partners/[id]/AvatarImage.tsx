'use client';

import React, { useState } from 'react';

interface AvatarImageProps {
  src: string;
  alt: string;
}

export default function AvatarImage({ src, alt }: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return null;
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className="w-full h-full object-cover relative z-10 bg-white" 
      onError={() => setHasError(true)} 
    />
  );
}
