export namespace Token {
  export interface Definition<Element, T extends Token> {
    test(element: Element): boolean;
    create(element: Element): T;
  }
}

export abstract class Token<Type extends string = string, Value = unknown> {
  readonly #type: Type;

  readonly #lexeme: string;

  readonly #value: Value;

  constructor(type: Type, lexeme: string, value: Value) {
    this.#type = type;
    this.#lexeme = lexeme;
    this.#value = value;
  }

  type(): Type {
    return this.#type;
  }

  lexeme(): string {
    return this.#lexeme;
  }

  value(): Value {
    return this.#value;
  }
}
