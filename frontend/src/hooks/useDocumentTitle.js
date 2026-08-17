import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | QAVLIO` : 'QAVLIO — Buy. Sell. Discover.';
    return () => { document.title = 'QAVLIO — Buy. Sell. Discover.'; };
  }, [title]);
}
