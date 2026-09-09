import { describe, expect, it } from 'vitest';

import { Token } from './Token.js';

describe('Token', () => {
  class TestToken extends Token {}

  const type = 'type';
  const lexeme = 'lexeme';
  const value = Symbol('value');

  const token = new TestToken(type, lexeme, value);

  it('must return the type passed to the constructor', () => {
    expect(token.type()).toBe(type);
  });

  it('must return the lexeme passed to the constructor', () => {
    expect(token.lexeme()).toBe(lexeme);
  });

  it('must return the value passed to the constructor', () => {
    expect(token.value()).toBe(value);
  });
});
