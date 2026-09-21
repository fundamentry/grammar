import { type Stringable } from '@fundamentry/trait';

export class Printer {
  readonly #text: string;

  private constructor(text: string) {
    this.#text = text;
  }

  static create(): Printer {
    return new this('');
  }

  append(value: Stringable | undefined): Printer;

  append<T>(value: T | undefined, format: (value: T) => string): Printer;

  append<T>(
    value: T | undefined,
    format: (value: T) => string = String
  ): Printer {
    if (value === undefined) return this;

    return new Printer(`${this.#text}${format(value)}`);
  }

  print(): string {
    return this.#text;
  }
}
