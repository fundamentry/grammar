import { describe, expect, it } from 'vitest';

import { ParseError } from './ParseError.js';

describe('ParseError', () => {
  const message = 'message';

  const error = new ParseError(message);

  it('must set the message passed to the constructor', () => {
    expect(error.message).toBe(message);
  });

  it('must set its name to ParseError', () => {
    expect(error.name).toBe('ParseError');
  });

  it('must be an instance of Error', () => {
    expect(error).toBeInstanceOf(Error);
  });
});
