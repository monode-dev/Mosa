# Mosa (Monode's State API)

A unified format for reactivity to keep stuff consistent across Monode tools.

## Set Up

First initialize Mosa for your platform. For example if you're using Solid JS you would do this:

```tsx
import { initializeMosa } from "@monode/mosa";
import { mosaConfigForSolid } from "@monode/mosa/solid";

export { userProp, useFormula, doNow, doWatch } = initializeMosa(mosaConfigForSolid);
```

Initializing Mosa returns four main functions `useProp`, `useFormula`, `doNow`, and `doWatch`.

### `useProp`

Creates a basic, reactive value that can be read by using `myProp.value`, and written to using `myProp.value = newValue`.

```tsx
function MyComponent() {
  const myProp = useProp(0);

  return (
      {/* Assigning to `myProp.value` will cause the text below to automatically re-render. */}
    <Button onClick={() => myProp.value++}>
      {/* Because we read `myProp.value` this will automatically re-render when myProp changes. */}
      You've pressed the button {myProp.value} times.
    </Button>
  );
}
```

If you're curious, here is the actual source code for `useProp`.

```ts
export function useProp<GetType, SetType = GetType>(
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
}
```

### `useFormula`

Creates a reactive value that is derived from other reactive values and can be accessed via `myFormula.value`. It's like a computed property in Vue or SolidJS.

```tsx
function MyComponent(props: { firstName: string; lastName: string }) {
  const myFormula = useFormula(() => `${props.firstName} ${props.lastName}`);
  // Will re-render if firstName or lastName changes.
  return <Txt>{myFormula.value}</Txt>;
}
```

Can also be be called with a second function to create a read/write formula. Note, the write type is assumed to be the same as the read type, but you can override it if you need to.

```tsx
const myProp = useProp<number | null>(null);
// In this example we use `useFormula` to create a non-null version of `myProp`.
const myFormula = useFormula(
  () => myProp ?? 0,
  // Can be written to.
  (newValue: number) => (myProp.value = newValue),
);
```

If you're curious, here is the actual source code for `useFormula`.

```ts
export function useFormula<
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
}
```

### `doNow`

Just runs the provided function immediately and returns the result. It just helps corral code.

```tsx
// `myNum` will equal 42
const myNum = doNow(() => 42);
```

If you're curious, here is the actual source code for `doNow`.

```ts
export function doNow<T>(func: () => T): T {
  return func();
}
```

### `doWatch`

Runs the provided function immediately and then again whenever any of the reactive values it reads from change.

```tsx
const myProp = useProp(0);

// Immediately logs "myProp: 0"
doWatch(() => {
  console.log("myProp: ", myProp.value);
});

// Logs "myProp: 1" when myProp changes.
myProp.value = 1;
```

You may also provide an `on` option to control exactly which props to watch.

```tsx
const myProp = useProp(0);
const myOtherProp = useProp(0);

// Immediately logs "myProp: 0"
doWatch(
  () => {
    console.log("myProp: ", myProp.value);
  },
  { on: [myProp] },
);

// Logs "myProp: 1" when myProp changes.
myProp.value = 1;

// Does not log anything when myOtherProp changes.
myOtherProp.value = 1;
```

If you're curious, here is the actual source code for `doWatch`.

```ts
export function doWatch(
  func: () => void,
  options?: Partial<{
    on: ReadonlyProp<any>[];
  }>,
) {
  this.exists(options?.on)
    ? mosaConfig.createManualEffect({
        on: options.on,
        do: func,
      })
    : mosaConfig.createAutoEffect(func);
}
```
