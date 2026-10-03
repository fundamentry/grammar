import { expect } from 'vitest';

import { Failure, type Result, Success } from '@fundamentry/coproduct';
import { type Equatable } from '@fundamentry/trait';

const isResult = (value: unknown): value is Result<unknown, unknown> =>
  value instanceof Success || value instanceof Failure;

const isEquatable = (value: unknown): value is Equatable<unknown> =>
  value instanceof Object &&
  'equals' in value &&
  typeof value.equals === 'function';

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
    if (!isEquatable(left) && !isEquatable(right)) return undefined;

    return (
      isEquatable(left) &&
      isEquatable(right) &&
      left.constructor === right.constructor &&
      left.equals(right)
    );
  },
]);
