import { describe, expect, it, vi } from 'vitest';

import { Printer } from './Printer.js';

describe('Printer', () => {
  describe('create', () => {
    it('must return an empty printer', () => {
      expect(Printer.create().print()).toBe('');
    });
  });

  describe('append', () => {
    it('must append a plain string', () => {
      const printer = Printer.create().append('a').append('b');

      expect(printer.print()).toBe('ab');
    });

    it('must append the value via its toString when no formatter is given', () => {
      const printer = Printer.create()
        .append('a')
        .append({ toString: () => 'b' });

      expect(printer.print()).toBe('ab');
    });

    it('must append the formatted value when a formatter is given', () => {
      const format = vi.fn((value: number) => value.toFixed(0));
      const printer = Printer.create().append('a').append(1, format);

      expect(format).toHaveBeenCalledOnce();
      expect(format).toHaveBeenCalledWith(1);
      expect(printer.print()).toBe('a1');
    });

    it('must return the same instance without calling the formatter when the value is undefined', () => {
      const format = vi.fn();
      const printer = Printer.create().append('a');

      const result = printer.append(undefined, format);

      expect(format).not.toHaveBeenCalled();
      expect(result).toBe(printer);
    });

    it('must return the same instance when the value is undefined and no formatter is given', () => {
      const printer = Printer.create().append('a');

      const result = printer.append(undefined);

      expect(result).toBe(printer);
    });

    it('must append a defined but falsy value', () => {
      const format = vi.fn((value: number) => value.toFixed(0));
      const printer = Printer.create().append('a').append(0, format);

      expect(format).toHaveBeenCalledWith(0);
      expect(printer.print()).toBe('a0');
    });

    it('must return a new printer instead of mutating the original', () => {
      const printer = Printer.create().append('a');

      const result = printer.append({ toString: () => 'b' });

      expect(result).not.toBe(printer);
      expect(printer.print()).toBe('a');
      expect(result.print()).toBe('ab');
    });

    it('must allow chaining multiple appends', () => {
      const printer = Printer.create()
        .append('a')
        .append(1, value => value.toFixed(0))
        .append({ toString: () => 'b' });

      expect(printer.print()).toBe('a1b');
    });
  });

  describe('print', () => {
    it('must default to an empty string when nothing was appended', () => {
      expect(Printer.create().print()).toBe('');
    });

    it('must return the appended text', () => {
      expect(Printer.create().append('a').print()).toBe('a');
    });
  });
});
