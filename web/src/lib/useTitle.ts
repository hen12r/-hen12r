import { useEffect } from 'react';
import { BRAND_NAME } from '../brand';

/** Sets the browser tab title; pass undefined for the brand alone. */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BRAND_NAME}` : `${BRAND_NAME}`;
  }, [title]);
}
