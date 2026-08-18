// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AISearchExplanation from './AISearchExplanation';
import AISearchFilters from './AISearchFilters';
import AISuggestionActions from './AISuggestionActions';
import AIQualityScore from './AIQualityScore';
import AIPriceInsight from './AIPriceInsight';
import RecommendationSection from './RecommendationSection';
import AIListingResults from './AIListingResults';
import AIUsageIndicator from './AIUsageIndicator';

const el = React.createElement;

function wrap(node) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return el(QueryClientProvider, { client }, el(MemoryRouter, null, node));
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data: {} }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('AI search explanation', () => {
  it('states how many listings matched', () => {
    render(wrap(el(AISearchExplanation, { total: 7, explanation: 'Showing 7 of 7 QAVLIO listings matching your search.' })));
    expect(screen.getByText(/Showing 7 of 7/i)).toBeTruthy();
  });

  it('offers a spelling correction without applying it', async () => {
    const onAccept = vi.fn();
    render(wrap(el(AISearchExplanation, {
      correction: { original: 'ipone', suggestion: 'iPhone', applied: false },
      onAcceptCorrection: onAccept,
    })));
    expect(screen.getByText(/Did you mean/i)).toBeTruthy();
    // The original query is still shown as what was actually searched.
    expect(screen.getByText(/We kept your original search/i)).toBeTruthy();
    expect(onAccept).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'iPhone' }));
    expect(onAccept).toHaveBeenCalledWith('iPhone');
  });

  it('discloses when filters were relaxed to find results', () => {
    render(wrap(el(AISearchExplanation, { total: 3, relaxedFilters: ['attributes', 'year'] })));
    expect(screen.getByText(/we relaxed specific attributes, the year range/i)).toBeTruthy();
  });

  it('shows zero-result recovery options instead of inventing listings', async () => {
    const onAction = vi.fn();
    render(wrap(el(AISearchExplanation, {
      empty: true,
      recovery: {
        message: 'No exact matches found.',
        note: 'These are broader options from real QAVLIO listings.',
        relatedCategories: [{ slug: 'mobiles', name: 'Mobiles' }],
        nearbyLocations: ['Lahore'],
        suggestedSearches: ['iphone under Rs. 300,000'],
        broaderPrice: { maxPrice: 300000, label: 'Up to Rs. 300,000' },
      },
      onRecoveryAction: onAction,
    })));
    expect(screen.getByText('No exact matches found.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Lahore' }));
    expect(onAction).toHaveBeenCalledWith({ location: 'Lahore' });
  });

  it('announces status changes to screen readers', () => {
    const { container } = render(wrap(el(AISearchExplanation, { loading: true })));
    expect(container.querySelector('[role="status"][aria-live="polite"]')).toBeTruthy();
  });
});

describe('AI search filters', () => {
  const filters = [
    { key: 'category', label: 'Category', value: 'mobiles' },
    { key: 'maxPrice', label: 'Max price', value: 'Rs. 250,000' },
  ];

  it('shows every filter the AI applied', () => {
    render(wrap(el(AISearchFilters, { filters })));
    expect(screen.getByText(/Filters QAVLIO applied/i)).toBeTruthy();
    expect(screen.getByText('Category: mobiles')).toBeTruthy();
  });

  it('lets the user remove an AI-applied filter', async () => {
    const onRemove = vi.fn();
    render(wrap(el(AISearchFilters, { filters, onRemove })));
    await userEvent.click(screen.getByRole('button', { name: /Remove filter Max price/i }));
    expect(onRemove).toHaveBeenCalledWith(filters[1]);
  });
});

describe('Seller suggestion actions', () => {
  it('offers Apply, Edit and Dismiss and applies nothing until asked', async () => {
    const onApply = vi.fn();
    render(wrap(el(AISuggestionActions, { label: 'Suggested title', value: 'iPhone 13 128GB Blue', onApply })));
    expect(screen.getByRole('button', { name: /Apply/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Edit/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Dismiss/i })).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /^Apply$/i }));
    expect(onApply).toHaveBeenCalledWith('iPhone 13 128GB Blue');
    expect(screen.getByText(/Applied to your listing/i)).toBeTruthy();
  });

  it('applies the edited text when the seller changes it first', async () => {
    const onApply = vi.fn();
    render(wrap(el(AISuggestionActions, { label: 'Suggested title', value: 'iPhone 13', onApply })));
    await userEvent.click(screen.getByRole('button', { name: /Edit/i }));
    const input = screen.getByLabelText(/Edit the Suggested title suggestion/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'iPhone 13 128GB');
    await userEvent.click(screen.getByRole('button', { name: /^Apply$/i }));
    expect(onApply).toHaveBeenCalledWith('iPhone 13 128GB');
  });

  it('dismissing removes the suggestion without touching the listing', async () => {
    const onApply = vi.fn();
    render(wrap(el(AISuggestionActions, { label: 'Suggested title', value: 'iPhone 13', onApply })));
    await userEvent.click(screen.getByRole('button', { name: /Dismiss/i }));
    expect(screen.queryByText('iPhone 13')).toBeNull();
    expect(onApply).not.toHaveBeenCalled();
  });
});

describe('Listing quality score', () => {
  it('renders the score and states it is not a trust score', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { action: 'quality', score: 82, grade: 'Good', breakdown: [{ id: 'title', label: 'Title quality', earned: 20, weight: 20 }], improvements: ['Add more photos.'], disclaimer: 'This measures listing completeness only. It is not a trust score and does not verify the seller or the item.' } }),
    }));
    render(wrap(el(AIQualityScore, { title: 'iPhone 15 Pro 256GB', description: 'x'.repeat(200), category: 'mobiles' })));
    await waitFor(() => expect(screen.getByText('82/100 · Good')).toBeTruthy());
    expect(screen.getByText(/not a trust score/i)).toBeTruthy();
  });
});

describe('Price insight', () => {
  it('labels the range as coming from QAVLIO listings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { action: 'price-insight', available: true, sampleSize: 12, currency: 'PKR', min: 100000, max: 400000, low: 150000, high: 300000, median: 220000, label: 'Based on QAVLIO listings', message: 'Similar listings are commonly listed between Rs. 150,000 and Rs. 300,000.', note: 'Based on 12 comparable QAVLIO listings.' } }),
    }));
    render(wrap(el(AIPriceInsight, { category: 'mobiles' })));
    await waitFor(() => expect(screen.getByText(/Based on QAVLIO listings/i)).toBeTruthy());
  });

  it('says so honestly when there is not enough comparable data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { action: 'price-insight', available: false, sampleSize: 1, label: 'Based on QAVLIO listings', message: "I don't have enough comparable QAVLIO listings to give a reliable price range yet.", note: 'QAVLIO does not estimate market value without real comparable listings.' } }),
    }));
    render(wrap(el(AIPriceInsight, { category: 'services' })));
    await waitFor(() => expect(screen.getByText(/don't have enough comparable/i)).toBeTruthy());
  });
});

describe('Recommendations', () => {
  const listings = [{ publicId: 'QV-100285', slug: 'iphone-15-pro', title: 'iPhone 15 Pro', price: 245000, currency: 'PKR', location: { city: 'Islamabad' }, reason: 'Matches a category you browse' }];

  it('renders a personalised row with its factual basis', () => {
    render(wrap(el(RecommendationSection, { title: 'Recommended for You', basis: 'Based on listings you viewed.', listings, personalized: true })));
    expect(screen.getByRole('heading', { name: 'Recommended for You' })).toBeTruthy();
    expect(screen.getByText('Based on listings you viewed.')).toBeTruthy();
  });

  it('marks non-personalised rows so no false claim is made', () => {
    render(wrap(el(RecommendationSection, { title: 'Popular Near You', listings, personalized: false })));
    expect(screen.getByText(/Not personalised/i)).toBeTruthy();
  });

  it('renders nothing when there are no real listings', () => {
    const { container } = render(wrap(el(RecommendationSection, { title: 'Recommended for You', listings: [] })));
    expect(container.textContent).toBe('');
  });
});

describe('AI listing results', () => {
  it('shows the hallucination-guard message when nothing was verified', () => {
    render(wrap(el(AIListingResults, { listings: [] })));
    expect(screen.getByText(/I couldn't verify that from the available QAVLIO listings\./i)).toBeTruthy();
  });

  it('reports how many of the total are shown', () => {
    const listings = [{ publicId: 'QV-1', slug: 'a', title: 'A', price: 100, location: {} }];
    render(wrap(el(AIListingResults, { listings, total: 9 })));
    expect(screen.getByText(/Showing 1 of 9 matching listings/i)).toBeTruthy();
  });
});

describe('AI usage indicator', () => {
  it('is honest about unavailability', () => {
    render(wrap(el(AIUsageIndicator, { state: 'unavailable' })));
    expect(screen.getByText(/temporarily unavailable/i)).toBeTruthy();
  });

  it('exposes status to assistive technology', () => {
    const { container } = render(wrap(el(AIUsageIndicator, { state: 'thinking' })));
    expect(container.querySelector('[role="status"][aria-live="polite"]')).toBeTruthy();
  });
});
