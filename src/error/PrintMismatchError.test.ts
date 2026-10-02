import { describe, expect, it } from 'vitest';

import { PrintMismatchError } from './PrintMismatchError.js';

describe('PrintMismatchError', () => {
  const message = 'message';

  const error = new PrintMismatchError(message);

  it('must set the message passed to the constructor', () => {
    expect(error.message).toBe(message);
  });

  it('must set its name to PrintMismatchError', () => {
    expect(error.name).toBe('PrintMismatchError');
  });

  it('must be an instance of Error', () => {
    expect(error).toBeInstanceOf(Error);
  });
});
