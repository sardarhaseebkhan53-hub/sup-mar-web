import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | DealHub` : 'DealHub — Buy. Sell. Discover.';
    return () => { document.title = 'DealHub — Buy. Sell. Discover.'; };
  }, [title]);
}
