// Tiny pub/sub so study features can tell the pet what happened without knowing about it.
export type PetEvent =
  | { type: "correct" }
  | { type: "wrong" }
  | { type: "complete" }
  | { type: "exam"; score: number }
  | { type: "start" }
  | { type: "search" };

type Listener = (event: PetEvent) => void;

const listeners = new Set<Listener>();

export const emitPet = (event: PetEvent): void => {
  listeners.forEach((listener) => listener(event));
};

export const onPet = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
