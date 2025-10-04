import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.performance = {
  getEntriesByType: () => [{ type: 'navigate' }],
};

// Optional: catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled Rejection:', reason);
});

Object.defineProperty(global, 'performance', {
  value: {
    getEntriesByType: () => [{ type: 'navigate' }],
  },
});
