import { describe, expect, it } from 'vitest';

import { Named } from './Named.js';
import { Quoted } from './Quoted.js';

describe('Quoted', () => {
  describe('of', () => {
    it('must let case matter for text with letters', () => {
      expect(Quoted.of('http').isCaseSensitive()).toBe(true);
    });

    it('must not let case matter for text without letters', () => {
      expect(Quoted.of('::').isCaseSensitive()).toBe(false);
      expect(Quoted.of('é').isCaseSensitive()).toBe(false);
    });
  });

  describe('caseless', () => {
    it('must not let case matter', () => {
      expect(Quoted.of('http').caseless().isCaseSensitive()).toBe(false);
    });

    it('must keep its text', () => {
      expect(Quoted.of('http').caseless().text()).toBe('http');
    });
  });

  describe('text', () => {
    it('must return the text it expects', () => {
      expect(Quoted.of('http').text()).toBe('http');
    });
  });

  describe('equals', () => {
    it('must equal an expectation of the same text and case sensitivity', () => {
      expect(Quoted.of('http').equals(Quoted.of('http'))).toBe(true);
    });

    it('must not equal an expectation of other text', () => {
      expect(Quoted.of('http').equals(Quoted.of('ftp'))).toBe(false);
    });

    it('must not equal an expectation of other case sensitivity', () => {
      expect(Quoted.of('http').equals(Quoted.of('http').caseless())).toBe(
        false
      );
    });

    it('must equal an expectation of the same text without letters, however it was made', () => {
      expect(Quoted.of('::').equals(Quoted.of('::').caseless())).toBe(true);
    });

    it('must not equal another kind of expectation', () => {
      expect(Quoted.of('http').equals(new Named("'http'"))).toBe(false);
    });
  });

  describe('toString', () => {
    it('must render as case-insensitive text', () => {
      expect(String(Quoted.of('http').caseless())).toBe('"http"');
    });

    it('must mark case-sensitive text', () => {
      expect(String(Quoted.of('http'))).toBe('%s"http"');
    });

    it.each([
      ['a quotation mark', 'a"b', '%x61.22.62'],
      ['a control character', 'a\tb', '%x61.09.62'],
      ['a character outside ASCII', 'é', '%xE9'],
    ])('must spell out text with %s in hexadecimal', (_, text, expected) => {
      expect(String(Quoted.of(text))).toBe(expected);
    });
  });
});
