import { Prism } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
import { type RangeSet } from '@fundamentry/range';
import { type CodePoint } from '@fundamentry/scalar';

import { Codec } from '#project/codec';
import { Literal, type Node } from '#project/tree';

export type Production<T extends Node> = Codec<CodePoint, T, string>;

export namespace Production {
  export const literal = (ranges: RangeSet<CodePoint>): Production<Literal> =>
    Codec.token(
      Prism.of<CodePoint, Literal, string>(
        codePoint =>
          ranges.contains(codePoint)
            ? new Success(new Literal(codePoint))
            : new Failure(
                `Expected a code point in ${ranges.toString()}, got '${codePoint.toString()}'`
              ),
        value => value.codePoint()
      )
    );
}
