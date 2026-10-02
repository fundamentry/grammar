import { describe, expect, it } from 'vitest';

import { SymbolMismatchError } from './SymbolMismatchError.js';

describe('SymbolMismatchError', () => {
  const message = 'message';

  const error = new SymbolMismatchError(message);

  it('must set the message passed to the constructor', () => {
    expect(error.message).toBe(message);
  });

  it('must set its name to SymbolMismatchError', () => {
    expect(error.name).toBe('SymbolMismatchError');
  });

  it('must be an instance of Error', () => {
    expect(error).toBeInstanceOf(Error);
  });
});
