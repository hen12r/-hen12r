import React, { useCallback } from 'react';

/** Returns an <input type="file"> change handler that reads the image as a data URI. */
export function useImageUpload(onImage: (dataUri: string) => void | Promise<void>) {
  return useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      void onImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [onImage]);
}
