import { useEffect } from 'react';

const defaultTitle = 'QAVLIO — Buy, Sell & Discover';

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | QAVLIO` : defaultTitle;
    return () => { document.title = defaultTitle; };
  }, [title]);
}
