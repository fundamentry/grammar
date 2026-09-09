import { Recognition } from './Recognition.js';

export class Matched<Value> extends Recognition {
  readonly #value: Value;

  constructor(value: Value) {
    super();

    this.#value = value;
  }

  override match(): true {
    return true;
  }

  value(): Value {
    return this.#value;
  }

  override map<Mapped>(mapper: (value: Value) => Mapped): Matched<Mapped> {
    return new Matched(mapper(this.#value));
  }

  override orElse(): this {
    return this;
  }
}
