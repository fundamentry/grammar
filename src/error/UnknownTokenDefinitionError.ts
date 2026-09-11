export class UnknownTokenDefinitionError<Element = unknown> extends Error {
  readonly #element: Element;

  constructor(element: Element) {
    super(`No token definition matched the given element: ${String(element)}`);

    this.name = 'UnknownTokenDefinitionError';
    this.#element = element;
  }

  element(): Element {
    return this.#element;
  }
}
