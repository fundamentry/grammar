import { describe, expect, it } from 'vitest';

import { Named } from './Named.js';

describe('Named', () => {
  it('must render as its name', () => {
    expect(String(new Named('a digit'))).toBe('a digit');
    expect(new Named('a digit').name()).toBe('a digit');
  });

  it('must equal another expectation with the same name only', () => {
    expect(new Named('a digit').equals(new Named('a digit'))).toBe(true);
    expect(new Named('a digit').equals(new Named('a letter'))).toBe(false);
    expect(new Named('a digit').equals('a digit')).toBe(false);
  });
});
