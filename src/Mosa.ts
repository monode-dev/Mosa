// SECTION: Types
export type MosaConfig = Parameters<typeof initializeMosa>[0];
export type MosaApi = ReturnType<typeof initializeMosa>;
export type ReadonlyProp<T> = { get value(): Unionize<T> };
export type WriteonlyProp<T> = { set value(x: Unionize<T>) };
export type Prop<GetType, SetType = GetType> = ReadonlyProp<GetType> &
  WriteonlyProp<SetType>;
export type Unionize<T> = _Unionize<T, T>;
type _Unionize<T, All> = T extends any
  ? T extends null | undefined
    ? T
    : T &
        _UnionToIntersection<
          _PropsToUndefined<
            Exclude<All extends NonObjects ? never : All, T>,
            keyof T
          >
        >
  : never;
type NonObjects =
  | boolean
  | number
  | string
  | symbol
  | null
  | undefined
  | Function
  | Date
  | RegExp;
// From: https://stackoverflow.com/a/50375286
type _UnionToIntersection<U> = (
  U extends any ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;
type _PropsToUndefined<T, ExcludeKeys> = T extends any
  ? { [K in Exclude<keyof T, ExcludeKeys>]?: undefined }
  : never;

// SECTION: Initialize
export function initializeMosa(mosaConfig: {
  createRoot: <T>(func: () => T) => T;
  createSignal<T>(initValue: T): { get(): T; set(newValue: T): void };
  createComputed<T>(get: () => T): { get(): T };
  createAutoEffect(effect: () => void): void;
  createManualEffect(params: {
    on: { get value(): any }[];
    do: () => void;
  }): void;
  onDispose(func: () => void): void;
}) {
  return {
    // SECTION: use Root
    /** Runs the provided function in a root-level reactive context. */
    useRoot<T>(func: () => T) {
      return mosaConfig.createRoot(func);
    },

    // SECTION: Prop
    /** Creates a reactive value that can be accessed via `.value`.
     * ```tsx
     * function MyComponent() {
     *   const myProp = useProp(0);
     *   return (
     *     // Assigning to `myProp.value` will cause the text below to automatically re-render.
     *     <button onClick={() => myProp.value++}
     *       // Because we read `myProp.value` this will automatically re-render when myProp changes.
     *       >You've pressed the button {myProp.value} times.
     *     </button>
     *   );
     * }
     * ``` */
    useProp<GetType, SetType = GetType>(
      initValue: GetType | SetType,
    ): Prop<GetType, SetType> {
      const { get, set } = mosaConfig.createSignal(initValue);
      // We prefer to the `.value` syntax to Solid's function syntax, hence why we do this.
      return {
        // Reads the value, and triggers a re-render when it changes.
        get value(): Unionize<GetType> {
          return get() as Unionize<GetType>;
        },
        // Updates the value and notifies all watchers.
        set value(newValue: Unionize<SetType>) {
          set(newValue as any);
        },
      } as any;
    },

    // SECTION: Formula
    /** Creates a reactive value that is derived from other reactive values and can be accessed
     * via `myFormula.value`.
     * ```tsx
     * function MyComponent(props: { firstName: string; lastName: string }) {
     *   const myFormula = useFormula(() => `${props.firstName} ${props.lastName}`);
     *   // Will re-render if firstName or lastName changes.
     *   return <Txt>{myFormula.value}</Txt>;
     * }
     * ```
     * Can also be be called with a second function to create a read/write formula. Note, the
     * write type is assumed to be the same as the read type, but you can override it if you
     * need to.
     * ```ts
     * const myProp = useProp<number | null>(null);
     * // In this example we use `useFormula` to create a non-null version of `myProp`.
     * const myFormula = useFormula(
     *   () => myProp ?? 0,
     *   // Can be written to.
     *   (newValue: number) => (myProp.value = newValue),
     * );
     * ``` */
    useFormula<
      GetType,
      Setter extends ((value: any) => any) | undefined =
        | ((value: GetType) => any)
        | undefined,
    >(
      compute: () => GetType,
      /** Optional setter function */
      set?: Setter,
    ): ReadonlyProp<GetType> &
      (undefined extends Setter
        ? {}
        : Setter extends (...args: any[]) => any
        ? WriteonlyProp<Parameters<Setter>[0]>
        : {}) {
      const { get } = mosaConfig.createComputed(compute);
      return {
        _isSig: true,
        get value(): GetType {
          return get();
        },
        // The value can't be set on readonly formulas.
        set value(newValue) {
          set?.(newValue);
        },
      } as any;
    },

    // SECTION: Do Now
    /** Runs the provided function immediately and returns the result.
     * ```tsx
     * // `myNum` will equal 42
     * const myNum = doNow(() => 42);
     * ``` */
    doNow<T>(func: () => T): T {
      return func();
    },

    // SECTION: Do Watch
    /** Runs the provided function immediately and then re-runs it whenever any of the
     * reactive values it reads from change.
     * ```tsx
     * const myProp = useProp(0);
     *
     * // Immediately logs "myProp: 0"
     * doWatch(() => {
     *   console.log("myProp: ", myProp.value);
     * });
     *
     * // Logs "myProp: 1" when myProp changes.
     * myProp.value = 1;
     * ```
     * You may also provide an `on` option to control exactly which props to watch.
     * ```tsx
     * const myProp = useProp(0);
     * const myOtherProp = useProp(0);
     *
     * // Immediately logs "myProp: 0"
     * doWatch(
     *   () => {
     *     console.log("myProp: ", myProp.value);
     *   },
     *   { on: [myProp] },
     * );
     *
     * // Logs "myProp: 1" when myProp changes.
     * myProp.value = 1;
     *
     * // Does not log anything when myOtherProp changes.
     * myOtherProp.value = 1;
     * ``` */
    doWatch(
      func: () => void,
      options?: Partial<{
        on: ReadonlyProp<any>[];
      }>,
    ) {
      exists(options?.on)
        ? mosaConfig.createManualEffect({
            on: options.on,
            do: func,
          })
        : mosaConfig.createAutoEffect(func);
    },

    // SECTION: On Dispose
    /** Runs the provided function when the current reactive context is disposed. */
    onDispose(func: () => void) {
      mosaConfig.onDispose(func);
    },

    // SECTION: Exists
    /** A type save way to check if `x` is null/undefined. */
    exists,
  } as const;
}

function exists<T>(x: T): x is NonNullable<T> {
  return x !== undefined && x !== null;
}
