import { Matched } from './Matched.js';
import { Recognition } from './Recognition.js';

export class Unmatched extends Recognition {
  override match(): false {
    return false;
  }

  override map(): this {
    return this;
  }

  override orElse<Fallback>(fallback: () => Fallback): Matched<Fallback> {
    return new Matched(fallback());
  }
}
