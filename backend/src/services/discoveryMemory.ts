import { resetAlertMemory } from './alertService.js';
import { resetFavoriteMemory } from './favoriteService.js';
import { resetFollowMemory } from './followService.js';
import { resetPriceHistoryMemory } from './priceHistoryService.js';
import { resetRecentSearchMemory } from './recentSearchService.js';
import { resetRecentlyViewedMemory } from './recentlyViewedService.js';
import { resetSavedSearchMemory } from './savedSearchService.js';

export function resetDiscoveryMemory() {
  resetFavoriteMemory();
  resetSavedSearchMemory();
  resetFollowMemory();
  resetRecentSearchMemory();
  resetRecentlyViewedMemory();
  resetPriceHistoryMemory();
  resetAlertMemory();
}
