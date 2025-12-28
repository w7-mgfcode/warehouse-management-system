import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

/**
 * Vitest test setup
 * Cleans up React components after each test
 */

// Cleanup after each test
afterEach(() => {
  cleanup();
});
