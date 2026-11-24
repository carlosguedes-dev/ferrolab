import '@testing-library/jest-dom/vitest';
import { MotionGlobalConfig } from 'framer-motion';

// Evita retenção de nós em saída de AnimatePresence no jsdom durante testes unitários
MotionGlobalConfig.skipAnimations = true;

Object.defineProperty(window, 'scrollTo', {
  value: () => {},
  writable: true,
});
