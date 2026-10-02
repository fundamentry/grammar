import { type CodePoint } from '@fundamentry/scalar';

import { type Codec } from '#project/codec';

export type Production<T> = Codec<CodePoint, T, string>;
