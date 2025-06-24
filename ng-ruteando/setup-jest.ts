import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import '@testing-library/jest-dom';

setupZoneTestEnv();

// Mock jsPDF
jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    save: jest.fn(),
    addPage: jest.fn(),
    text: jest.fn(),
    setFontSize: jest.fn(),
    setTextColor: jest.fn(),
    setFillColor: jest.fn(),
    rect: jest.fn(),
    autoTable: jest.fn(),
  })),
}));

// Mock jspdf-autotable
jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock html2canvas
jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock'),
  }),
}));

// Mock file-saver
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

// Mock global objects
Object.defineProperty(window, 'CSS', { value: null });
Object.defineProperty(window, 'getComputedStyle', {
  value: () => {
    return {
      display: 'none',
      appearance: ['-webkit-appearance'],
    };
  },
});

Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>',
});

Object.defineProperty(window, 'matchMedia', {
  value: () => {
    return {
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    };
  },
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Audio for NotificationService
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
}));

// Mock $localize for Angular i18n components like NgbPagination
global.$localize = jest.fn((messageParts, ...expressions) => {
  if (typeof messageParts === 'string') {
    return messageParts;
  }
  // Handle template literal case
  let result = '';
  for (let i = 0; i < messageParts.length; i++) {
    result += messageParts[i];
    if (i < expressions.length) {
      result += expressions[i];
    }
  }
  return result;
}); 