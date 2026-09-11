import { UnknownTokenDefinitionError } from '#project/error';
import { type Token } from '#project/token';

import { type Lexer } from './Lexer.js';

export class DefinitionLexer<
  Element,
  Type extends string = string,
  Source extends Iterable<Element> = Iterable<Element>,
> implements Lexer<Source> {
  readonly #definitions: readonly Token.Definition<Element, Token<Type>>[];

  constructor(definitions: readonly Token.Definition<Element, Token<Type>>[]) {
    this.#definitions = definitions;
  }

  *tokenize(source: Source): Iterable<Token<Type>> {
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

  hasDefinitionFor(type: Type): boolean {
    return this.#definitions.some(definition => definition.type === type);
  }
}
