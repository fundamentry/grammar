import { Data } from '#project/data';

export class Definition extends Data {
  readonly #body: string;

  readonly #name?: string;

  constructor(body: string, name?: string) {
    super();

    this.#body = body;
    this.#name = name;
  }

  name(): string | undefined {
    return this.#name;
  }

  body(): string {
    return this.#body;
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Definition &&
      this.#name === other.#name &&
      this.#body === other.#body
    );
  }

  override toString(): string {
    return this.#name ? `${this.#name} = ${this.#body}` : this.#body;
  }
}
