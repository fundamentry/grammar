import { UnknownTokenDefinitionError } from '#project/error';
import { type Token } from '#project/token';

import { type Lexer } from './Lexer.js';

export class DefinitionLexer<
  Element,
  Source extends Iterable<Element> = Iterable<Element>,
> implements Lexer<Source> {
  readonly #definitions: readonly Token.Definition<Element, Token>[];

  constructor(definitions: readonly Token.Definition<Element, Token>[]) {
    this.#definitions = definitions;
  }

  *tokenize(source: Source): Iterable<Token> {
    for (const element of source) {
      const definition = this.#definitions.find(candidate =>
        candidate.test(element)
      );

      if (!definition) throw new UnknownTokenDefinitionError(element);

      yield definition.create(element);
    }
  }

  definitions() {
    return this.#definitions;
  }

  hasDefinitionFor(token: Token): boolean {
    return this.#definitions.some(
      definition => definition.type === token.type()
    );
  }
}
