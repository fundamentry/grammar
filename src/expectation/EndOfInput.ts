import { Expectation } from './Expectation.js';

export class EndOfInput extends Expectation {
  override equals(other: unknown): boolean {
    return other instanceof EndOfInput;
  }

  override toString(): string {
    return 'end of input';
  }
}
