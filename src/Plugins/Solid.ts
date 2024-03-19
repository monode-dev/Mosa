import { createEffect, createMemo, createSignal, on } from "solid-js";
import { MosaConfig } from "../Mosa.js";

/** Use like:
 * ```ts
 * import { initializeMosa } from "mosa";
 * import { mosaConfigForSolid } from "mosa/solid";
 *
 * module.exports = initializeMosa(mosaConfigForSolid);
 * ```
 */
export const mosaConfigForSolid = {
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
} satisfies MosaConfig;
