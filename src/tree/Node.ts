import { Data } from '#project/data';

export abstract class Node extends Data {
  abstract children(): readonly Node[];
}
