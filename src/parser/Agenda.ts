export namespace Agenda {
  export interface Entry<out Scope> {
    readonly task: () => void;
    readonly scope: Scope;
  }
}

export class Agenda<in out Scope> {
  readonly #entries: Agenda.Entry<Scope>[] = [];

  #scope: Scope;

  constructor(root: Scope) {
    this.#scope = root;
  }

  schedule(task: () => void): void {
    this.#entries.push({ task, scope: this.#scope });
  }

  after(action: () => void, resume: () => void): void {
    this.schedule(resume);

    action();
  }

  each<T>(items: Iterator<T>, visit: (item: T) => void): void {
    const pull = () => {
      const next = items.next();

      if (next.done) return;

      this.schedule(pull);

      visit(next.value);
    };

    this.schedule(pull);
  }

  within(scope: Scope, action: () => void): void {
    const outer = this.#scope;

    this.#scope = scope;

    action();

    this.#scope = outer;
  }

  scope(): Scope {
    return this.#scope;
  }

  drain(): void {
    for (let entry = this.#entries.pop(); entry; entry = this.#entries.pop())
      this.within(entry.scope, entry.task);
  }

  clear(): void {
    this.#entries.length = 0;
  }
}
