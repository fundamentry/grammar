import { describe, expect, it } from 'vitest';

import { EndOfInput } from './EndOfInput.js';
import { Named } from './Named.js';

describe('EndOfInput', () => {
  it('must render as the end of input', () => {
    expect(String(new EndOfInput())).toBe('end of input');
  });

  it('must equal any other end of input only', () => {
    expect(new EndOfInput().equals(new EndOfInput())).toBe(true);
    expect(new EndOfInput().equals(new Named('end of input'))).toBe(false);
  });
});
