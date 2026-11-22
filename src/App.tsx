/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MarketplaceProvider } from './app/providers/MarketplaceContext';
import { AppRouter } from './app/router';
import { GlobalModals } from './app/providers/GlobalModals';

export function MarketplaceApp() {
  return (
    <MarketplaceProvider>
      <AppRouter />
      <GlobalModals />
    </MarketplaceProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MarketplaceApp />
    </ErrorBoundary>
  );
}
