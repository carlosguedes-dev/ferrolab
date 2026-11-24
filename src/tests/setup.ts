import '@testing-library/jest-dom/vitest';

// Mock leve de matchMedia e scrollTo para jsdom
Object.defineProperty(window, 'scrollTo', {
  value: () => {},
  writable: true,
});
