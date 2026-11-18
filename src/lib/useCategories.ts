import { useEffect, useState } from 'react';
import { listCategories } from './api';
import type { Category } from './types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => { listCategories().then(setCategories).catch(() => undefined); }, []);
  const byId = new Map(categories.map((c) => [c.id, c]));
  return { categories, byId, setCategories };
}
