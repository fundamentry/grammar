import { describe, expect, it } from 'vitest';

import { Definition } from './Definition.js';

describe('Definition', () => {
  describe('name', () => {
    it('must return the name of the rule it defines', () => {
      expect(new Definition('CR LF', 'CRLF').name()).toBe('CRLF');
    });

    it('must return nothing for an unnamed definition', () => {
      expect(new Definition('*DIGIT').name()).toBeUndefined();
    });
  });

  describe('body', () => {
    it('must return what defines the rule', () => {
      expect(new Definition('CR LF', 'CRLF').body()).toBe('CR LF');
    });
  });

  describe('equals', () => {
    it('must equal a definition with the same name and body', () => {
      expect(
        new Definition('CR LF', 'CRLF').equals(new Definition('CR LF', 'CRLF'))
      ).toBe(true);
    });

    it('must not equal a definition with another name', () => {
      expect(
        new Definition('CR LF', 'CRLF').equals(new Definition('CR LF', 'EOL'))
      ).toBe(false);
    });

    it('must not equal a definition with another body', () => {
      expect(
        new Definition('CR LF', 'CRLF').equals(new Definition('LF', 'CRLF'))
      ).toBe(false);
    });

    it('must not equal a value that is not a definition', () => {
      expect(new Definition('CR LF', 'CRLF').equals('CRLF = CR LF')).toBe(
        false
      );
    });
  });

  describe('toString', () => {
    it('must render a named definition as a rule', () => {
      expect(String(new Definition('CR LF', 'CRLF'))).toBe('CRLF = CR LF');
    });

    it('must render an unnamed definition as its body', () => {
      expect(String(new Definition('*DIGIT'))).toBe('*DIGIT');
    });
  });
});
