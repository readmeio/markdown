import '@testing-library/jest-dom';

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => {
      return 'mock-uuid-12345'; // Return a fixed UUID for testing
    },
  },
});
