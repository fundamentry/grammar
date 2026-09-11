import { describe, expect, it } from 'vitest';

import { UnknownTokenDefinitionError } from './UnknownTokenDefinitionError.js';

describe('UnknownTokenDefinitionError', () => {
  const element = Symbol('element');

  const error = new UnknownTokenDefinitionError(element);

  it('must include the element in the message', () => {
    expect(error.message).toBe(
      `No token definition matched the given element: ${String(element)}`
    );
  });

  it('must set its name to UnknownTokenDefinitionError', () => {
    expect(error.name).toBe('UnknownTokenDefinitionError');
  });

  it('must return the element passed to the constructor', () => {
    expect(error.element()).toBe(element);
  });

  it('must be an instance of Error', () => {
    expect(error).toBeInstanceOf(Error);
  });
});
