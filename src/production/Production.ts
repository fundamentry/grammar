import { type CodePoint } from '@fundamentry/scalar';

import { type Codec } from '#project/codec';
import { type Node } from '#project/tree';

export type Production<T extends Node> = Codec<CodePoint, T>;
