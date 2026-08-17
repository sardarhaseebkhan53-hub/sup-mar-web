import { useEffect, useState } from 'react';
import { categories as fallbackCategories } from '../data/categories';
import { marketplaceApi } from '../services/apiClient';

let categoryCache = fallbackCategories;
let categoryRequest;

function normalizeCategories(records) {
  return records.map((record, index) => {
    const fallback = fallbackCategories.find((item) => item.slug === record.slug) || {};
    return {
      ...fallback,
      ...record,
      id: record.id || record._id || fallback.id || `category-${record.slug}`,
      order: record.order ?? fallback.order ?? index,
      accent: record.accent || fallback.accent || 'violet',
      count: record.count ?? fallback.count,
    };
  }).filter((record) => record.isActive !== false).sort((a, b) => a.order - b.order);
}

function loadCategories() {
  if (!categoryRequest) {
    categoryRequest = marketplaceApi.getCategories()
      .then((response) => {
        if (Array.isArray(response?.data) && response.data.length) categoryCache = normalizeCategories(response.data);
        return categoryCache;
      })
      .catch(() => categoryCache);
  }
  return categoryRequest;
}

export function useCategories() {
  const [categoryList, setCategoryList] = useState(categoryCache);

  useEffect(() => {
    let active = true;
    loadCategories().then((records) => { if (active) setCategoryList(records); });
    return () => { active = false; };
  }, []);

  return categoryList;
}
