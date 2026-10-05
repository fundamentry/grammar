import { Expectation } from './Expectation.js';

export class Text extends Expectation {
  readonly #text: string;

  readonly #caseSensitive: boolean;

  private constructor(text: string, caseSensitive: boolean) {
    super();

    this.#text = text;
    this.#caseSensitive = caseSensitive;
  }

  static caseSensitive(text: string): Text {
    return new Text(text, text.toLowerCase() !== text.toUpperCase());
  }

  static caseInsensitive(text: string): Text {
    return new Text(text, false);
  }

  text(): string {
    return this.#text;
  }

  isCaseSensitive(): boolean {
    return this.#caseSensitive;
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Text &&
      this.#text === other.#text &&
      this.#caseSensitive === other.#caseSensitive
    );
  }

  override toString(): string {
    return `'${this.#text}'`;
  }
}
