import { type RangeSet } from '@fundamentry/range';
import { type CodePoint } from '@fundamentry/scalar';

import { Symbol } from './Symbol.js';

export abstract class Terminal extends Symbol<CodePoint> {
  protected abstract domain(): RangeSet<CodePoint>;

  protected override isValid(codePoint: CodePoint): boolean {
    return this.domain().contains(codePoint);
  }
}
