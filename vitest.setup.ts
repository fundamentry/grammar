import { expect } from 'vitest';

import { Failure, type Result, Success } from '@fundamentry/coproduct';
import { Equatable } from '@fundamentry/trait';

const isResult = (value: unknown): value is Result<unknown, unknown> =>
  value instanceof Success || value instanceof Failure;

const unwrap = (result: Result<unknown, unknown>): unknown =>
  result.ok() ? result.value() : result.error();

expect.addEqualityTesters([
  function results(left: unknown, right: unknown, testers) {
    if (!isResult(left) && !isResult(right)) return undefined;

    return (
      isResult(left) &&
      isResult(right) &&
      left.ok() === right.ok() &&
      this.equals(unwrap(left), unwrap(right), testers)
    );
  },
  function equatables(left: unknown, right: unknown) {
    return Equatable.is(left) || Equatable.is(right)
      ? Equatable.equals<unknown>(left, right)
      : undefined;
  },
]);
