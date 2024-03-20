import { initializeMosa } from "../Mosa.js";
import {
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  on,
  onCleanup,
} from "solid-js";

/** Use like:
 * ```ts
 * import { mosaForSolid } from "mosa/solid-js";
 *
 * module.exports = mosaForSolid;
 * ```
 */
export const mosaForSolid = initializeMosa({
  createRoot: createRoot,
  createSignal: (initValue) => {
    const [get, set] = createSignal(initValue);
    return { get, set };
  },
  createComputed: (compute) => {
    return { get: createMemo(compute) };
  },
  createAutoEffect: createEffect,
  createManualEffect: ({ on: onSignals, do: effect }) => {
    createEffect(
      on(
        onSignals.map((signal) => () => signal.value),
        effect,
      ),
    );
  },
  onDispose: onCleanup,
});
