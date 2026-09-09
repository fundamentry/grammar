import { Tape } from '@fundamentry/stream';

import { ParseError } from '#project/error';
import { Matched } from '#project/recognition';
import { type Rule } from '#project/rule';
import { type Lexer } from '#project/type';

export class Parser<Source, Value> {
  readonly #rule: Rule<Value>;

  readonly #lexer: Lexer<Source>;

  constructor(rule: Rule<Value>, lexer: Lexer<Source>) {
    this.#rule = rule;
    this.#lexer = lexer;
  }

  parse(source: Source): Value {
    const input = new Tape(this.#lexer.tokenize(source));
    const recognition = this.#rule.derive(input);

    if (!(recognition instanceof Matched))
      throw new ParseError('Input does not match the expected grammar');

    if (!input.isAtEnd()) throw new ParseError('Unexpected trailing input');

    return recognition.value();
  }
}
