import { MosaConfig, initializeMosa } from "../Mosa.js";

/** Use like:
 * ```ts
 * import { initializeMosa } from "mosa";
 * import { getMosaConfigForSolid } from "mosa/solid";
 *
 * module.exports = initializeMosa(getMosaConfigForSolid({...}));
 * ```
 */
export function getMosaConfigForSolid(solidConfig: {
  createRoot: <T>(func: () => T) => T;
  createSignal<T>(initValue: T): [() => T, (newValue: T) => void];
  createMemo<T>(get: () => T): () => T;
  createEffect(effect: () => void): void;
  on(deps: (() => any)[], effect: () => void): () => void;
  onCleanup(func: () => void): void;
}) {
  return {
    createRoot: solidConfig.createRoot,
    createSignal: (initValue) => {
      const [get, set] = solidConfig.createSignal(initValue);
      return { get, set };
    },
    createComputed: (compute) => {
      return { get: solidConfig.createMemo(compute) };
    },
    createAutoEffect: solidConfig.createEffect,
    createManualEffect: ({ on: onSignals, do: effect }) => {
      solidConfig.createEffect(
        solidConfig.on(
          onSignals.map((signal) => () => signal.value),
          effect,
        ),
      );
    },
    onDispose: solidConfig.onCleanup,
  } satisfies MosaConfig;
}
