import { RangeSet } from '@fundamentry/range';
import { type CodePoint } from '@fundamentry/scalar';

import { Production } from '#project/production';
import { type Literal } from '#project/tree';

import { Symbol } from './Symbol.js';

export abstract class Terminal extends Symbol<Literal> {
  protected static readonly domain: RangeSet<CodePoint> =
    RangeSet.from<CodePoint>([]);

  static production<S extends Terminal>(
    this: (new (elements: Literal) => S) & typeof Terminal
  ): Production<S> {
    return Production.literal(this.domain).refine(this.prism<Literal, S>());
  }

  protected override isValid(literal: Literal): boolean {
    return (this.constructor as typeof Terminal).domain.contains(
      literal.codePoint()
    );
  }
}
