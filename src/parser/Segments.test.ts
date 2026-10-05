import { describe, expect, it, vi } from 'vitest';

import { Segments } from './Segments.js';

const even = (value: number) => value % 2 === 0;

describe('Segments', () => {
  it('must emit each accepted item as a segment of its own', () => {
    expect([...new Segments([2, 4], even)]).toEqual([
      { accepted: true, item: 2 },
      { accepted: true, item: 4 },
    ]);
  });

  it('must collect consecutive rejected items into one segment, in order', () => {
    expect([...new Segments([1, 3, 2, 5, 7], even)]).toEqual([
      { accepted: false, items: [1, 3] },
      { accepted: true, item: 2 },
      { accepted: false, items: [5, 7] },
    ]);
  });

  it('must emit nothing for no items', () => {
    expect([...new Segments<number>([], even)]).toEqual([]);
  });

  it('must not test an item before the segments ahead of it have been pulled', () => {
    const accepts = vi.fn(even);
    const segments = new Segments([2, 4], accepts)[Symbol.iterator]();

    segments.next();

    expect(accepts).toHaveBeenCalledExactlyOnceWith(2);
  });
});
