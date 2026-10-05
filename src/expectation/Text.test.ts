import { describe, expect, it } from 'vitest';

import { Named } from './Named.js';
import { Text } from './Text.js';

describe('Text', () => {
  describe('caseSensitive', () => {
    it('must let case matter for text with case', () => {
      expect(Text.caseSensitive('http').isCaseSensitive()).toBe(true);
    });

    it('must not let case matter for text without case', () => {
      expect(Text.caseSensitive('::').isCaseSensitive()).toBe(false);
    });
  });

  describe('caseInsensitive', () => {
    it('must not let case matter', () => {
      expect(Text.caseInsensitive('http').isCaseSensitive()).toBe(false);
    });
  });

  describe('text', () => {
    it('must return the text it expects', () => {
      expect(Text.caseSensitive('http').text()).toBe('http');
    });
  });

  describe('equals', () => {
    it('must equal an expectation of the same text and case sensitivity', () => {
      expect(
        Text.caseSensitive('http').equals(Text.caseSensitive('http'))
      ).toBe(true);
    });

    it('must not equal an expectation of other text', () => {
      expect(Text.caseSensitive('http').equals(Text.caseSensitive('ftp'))).toBe(
        false
      );
    });

    it('must not equal an expectation of other case sensitivity', () => {
      expect(
        Text.caseSensitive('http').equals(Text.caseInsensitive('http'))
      ).toBe(false);
    });

    it('must equal an expectation of the same text without case, however it was made', () => {
      expect(Text.caseSensitive('::').equals(Text.caseInsensitive('::'))).toBe(
        true
      );
    });

    it('must not equal another kind of expectation', () => {
      expect(Text.caseSensitive('http').equals(new Named("'http'"))).toBe(
        false
      );
    });
  });

  describe('toString', () => {
    it('must render as the quoted text', () => {
      expect(String(Text.caseInsensitive('http'))).toBe("'http'");
    });
  });
});
