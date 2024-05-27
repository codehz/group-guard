import { deepEqual } from "fast-equals";
import { create } from "mutative";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useInstance } from "./hooks/useInstance";
import { useLastPresentValue } from "./hooks/useLastPresentValue";

export type ResolvePath = readonly (string | number)[];
export type ResolvedType<T, S extends ResolvePath> = S extends readonly []
  ? T
  : T extends Array<infer I>
    ? S extends readonly [number, ...infer Tail extends ResolvePath]
      ? ResolvedType<I, Tail>
      : never
    : S extends readonly [
          infer Head extends keyof T & string,
          ...infer Tail extends ResolvePath,
        ]
      ? ResolvedType<T[Head], Tail>
      : never;

function rid() {
  return Math.random().toString(36).substring(2, 15);
}

export interface Tree<T> {
  value: T;
  on(keys: ResolvePath, callback: () => void): () => void;
  notify<S extends ResolvePath>(keys: S, only?: boolean): void;
  update(value: T | ((old: T) => T), only?: boolean): void;
  updateByPath<const S extends ResolvePath>(
    keys: S,
    value:
      | ResolvedType<T, S>
      | ((old: ResolvedType<T, S>) => ResolvedType<T, S>),
    only?: boolean
  ): void;
  getByPath<S extends ResolvePath>(keys: S): ResolvedType<T, S>;
  go<S extends ResolvePath>(...keys: S): Tree<ResolvedType<T, S>>;
}

export class SingleTree<T> implements Tree<T> {
  subscribers: Set<() => void> = new Set();
  get value() {
    return this.#value;
  }
  set value(value: T) {
    this.#value = value;
    this.notify([]);
  }
  #value: T;
  constructor(input: T) {
    this.#value = input;
  }
  on(_keys: ResolvePath, callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  notify<S extends ResolvePath>(_keys: S, _only?: boolean | undefined): void {
    for (const cb of this.subscribers.values()) {
      cb();
    }
  }
  update(value: T | ((old: T) => T), _only?: boolean | undefined): void {
    // @ts-ignore: optimize
    this.value = value instanceof Function ? value(this.value) : value;
    this.notify([]);
  }
  updateByPath<const S extends ResolvePath>(
    _keys: S,
    value:
      | ResolvedType<T, S>
      | ((old: ResolvedType<T, S>) => ResolvedType<T, S>),
    _only?: boolean | undefined
  ): void {
    // @ts-ignore: optimize
    this.value = value instanceof Function ? value(this.value) : value;
    this.notify([]);
  }
  getByPath<S extends ResolvePath>(_keys: S): ResolvedType<T, S> {
    return this.#value as any;
  }
  go<S extends ResolvePath>(..._keys: S): Tree<ResolvedType<T, S>> {
    return this as any;
  }
}

export class TreeRoot<T> implements Tree<T> {
  subscribers: Map<string, () => void> = new Map();
  #value: T;
  constructor(input: T) {
    this.#value = input;
  }

  get value() {
    return this.#value;
  }

  set value(value: T) {
    this.#value = value;
    this.notify([]);
  }

  on(keys: ResolvePath, callback: () => void) {
    const token = keys.join(".") + ".#" + rid();
    this.subscribers.set(token, callback);
    return () => this.subscribers.delete(token);
  }

  notify<S extends ResolvePath>(keys: S, only = false) {
    if (keys.length) {
      const token = keys.join(".") + (only ? ".#" : ".");
      for (const [key, cb] of this.subscribers) {
        if (key.startsWith(token)) {
          cb();
        }
      }
      this.notify(keys.slice(0, -1), true);
    } else if (!only) {
      for (const cb of this.subscribers.values()) {
        cb();
      }
    } else {
      for (const [key, cb] of this.subscribers) {
        if (key.startsWith(".")) {
          cb();
        }
      }
    }
  }

  update(value: T | ((old: T) => T)) {
    // @ts-ignore: optimize
    this.value = value instanceof Function ? value(this.value) : value;
    this.notify([]);
  }

  updateByPath<S extends ResolvePath>(
    keys: S,
    value:
      | ResolvedType<T, S>
      | ((old: ResolvedType<T, S>) => ResolvedType<T, S>),
    only = false
  ) {
    if (keys.length === 0) {
      // @ts-ignore: optimize
      this.#value = value instanceof Function ? value(this.#value) : value;
      this.notify([]);
    } else {
      this.#value = create(this.value, (tmp: any) => {
        if (tmp == null) return;
        for (let i = 0; i < keys.length - 1; i++) {
          const currentKey = keys[i];
          const nextKey = keys[i + 1];
          tmp =
            tmp[currentKey] ??
            (tmp[currentKey] = typeof nextKey === "number" ? [] : {});
        }
        const last = keys.at(-1);
        const newvalue =
          // @ts-ignore: too complex
          value instanceof Function ? value(tmp[last]) : value;
        // @ts-ignore: too complex
        if (deepEqual(tmp[last], newvalue)) return;
        // @ts-ignore: too complex
        tmp[last] = newvalue;
      });
      this.notify(keys, only);
    }
  }

  getByPath<S extends ResolvePath>(keys: S): ResolvedType<T, S> {
    let tmp: any = this.value;
    for (const key of keys) {
      if (tmp == null) return undefined as never;
      tmp = tmp[key];
    }
    return tmp as ResolvedType<T, S>;
  }

  go<S extends ResolvePath>(...keys: S): Tree<ResolvedType<T, S>> {
    return new SubTree(this, keys);
  }
}

export class NonNullTree<T extends {}> implements Tree<T> {
  #tree: Tree<T>;
  #oldvalue: T;
  constructor(tree: Tree<T>) {
    this.#tree = tree;
    this.#oldvalue = tree.value;
  }
  get value() {
    if (this.#tree.value != null) {
      return (this.#oldvalue = this.#tree.value);
    }
    return this.#oldvalue;
  }
  on(keys: ResolvePath, callback: () => void): () => void {
    return this.#tree.on(keys, () => {
      if (this.#tree.value != null) callback();
    });
  }
  notify<S extends ResolvePath>(keys: S, only?: boolean | undefined): void {
    if (this.#tree.value != null) this.#tree.notify(keys, only);
  }
  update(value: T | ((old: T) => T), only?: boolean | undefined): void {
    if (this.#tree.value != null) this.#tree.update(value, only);
  }
  updateByPath<const S extends ResolvePath>(
    keys: S,
    value:
      | ResolvedType<T, S>
      | ((old: ResolvedType<T, S>) => ResolvedType<T, S>),
    only?: boolean | undefined
  ): void {
    if (this.#tree.value != null) this.#tree.updateByPath(keys, value, only);
  }
  getByPath<S extends ResolvePath>(keys: S): ResolvedType<T, S> {
    if (this.#tree.value != null) {
      return this.#tree.getByPath(keys);
    } else {
      let tmp: any = this.value;
      for (const key of keys) {
        if (tmp == null) return undefined as never;
        tmp = tmp[key];
      }
      return tmp as ResolvedType<T, S>;
    }
  }
  go<S extends ResolvePath>(...keys: S): Tree<ResolvedType<T, S>> {
    return new SubTree(this.#tree, keys);
  }
}

export class SubTree<P, const S extends ResolvePath>
  implements Tree<ResolvedType<P, S>>
{
  parent: Tree<P>;
  path: S;
  constructor(parent: Tree<P>, path: S) {
    this.parent = parent;
    this.path = path;
  }
  get value(): ResolvedType<P, S> {
    return this.parent.getByPath(this.path);
  }
  set value(value: ResolvedType<P, S>) {
    this.parent.updateByPath(this.path, () => value);
  }
  on(keys: ResolvePath, callback: () => void) {
    return this.parent.on([...this.path, ...keys], callback);
  }
  notify<Q extends ResolvePath>(keys: Q, only = false): void {
    this.parent.notify([...this.path, ...keys], only);
  }
  update(
    value:
      | ResolvedType<P, S>
      | ((old: ResolvedType<P, S>) => ResolvedType<P, S>),
    only?: boolean
  ) {
    this.parent.updateByPath(this.path, value, only);
  }
  updateByPath<Q extends ResolvePath>(
    keys: Q,
    value:
      | ResolvedType<ResolvedType<P, S>, Q>
      | ((
          old: ResolvedType<ResolvedType<P, S>, Q>
        ) => ResolvedType<ResolvedType<P, S>, Q>),
    only = false
  ): void {
    this.parent.updateByPath(
      [...this.path, ...keys] as any,
      value as any,
      only
    );
  }
  getByPath<Q extends ResolvePath>(
    keys: Q
  ): ResolvedType<ResolvedType<P, S>, Q> {
    return this.parent.getByPath([...this.path, ...keys]);
  }
  go<S2 extends ResolvePath>(
    ...keys: S2
  ): Tree<ResolvedType<ResolvedType<P, S>, S2>> {
    return new SubTree(this.parent, [...this.path, ...keys]) as any;
  }
}

export function useTreeRoot<T>(input: T): TreeRoot<T> {
  return useInstance(() => new TreeRoot(JSON.parse(JSON.stringify(input))));
}

export function useSingleTree<T>(input: T): SingleTree<T> {
  return useInstance(() => new SingleTree(input));
}

export function useSubTree<T, const S extends ResolvePath>(
  root: Tree<T>,
  ...path: S
): SubTree<T, S> {
  return useMemo(() => new SubTree(root, path), [root, path]);
}

export function useSubTrees<T extends {}>(
  root: Tree<T>
): { [K in keyof T]-?: Tree<T[K]> } {
  return useMemo(() => {
    const ret = Object.fromEntries(
      Object.keys(root.value).map((k) => [k, new SubTree(root, [k])])
    );
    return new Proxy(ret, {
      get(target, p, receiver) {
        if (typeof p === "string" && !(p in target)) {
          ret[p] = new SubTree(root, [p]);
        }
        return Reflect.get(target, p, receiver);
      },
    });
  }, [root]) as any;
}

export function useTreeValue<T, const S extends ResolvePath>(
  root: Tree<T>,
  ...path: S
): ResolvedType<T, S> {
  const { subscribe, getSnapshot } = useMemo(
    () => ({
      subscribe: (cb: () => void) => root.on(path, cb),
      getSnapshot: () => root.getByPath(path),
    }),
    [root, path]
  );
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useLastPresentValue(value);
}

export function useTreeUpdater<T, const S extends ResolvePath>(
  root: Tree<T>,
  ...path: S
): (
  value: ResolvedType<T, S> | ((old: ResolvedType<T, S>) => ResolvedType<T, S>)
) => void {
  return useCallback(
    (
      newvalue:
        | ResolvedType<T, S>
        | ((old: ResolvedType<T, S>) => ResolvedType<T, S>)
    ) => root.updateByPath(path, newvalue),
    [root, path]
  );
}

export function useTree<T, const S extends ResolvePath>(
  root: Tree<T>,
  ...path: S
) {
  return [useTreeValue(root, ...path), useTreeUpdater(root, ...path)] as const;
}

export type InsertPlace =
  | { before: number }
  | { after: number }
  | { head: true }
  | undefined;

export type ArrayUpdater<T> = {
  insert(value: T, place?: InsertPlace): void;
  remove(index: number): T | undefined;
};

type ArrayValueType<T> = T extends (infer X)[] ? X : never;

export function useTreeArrayUpdater<T, S extends ResolvePath>(
  root: Tree<T>,
  ...path: S
): ArrayUpdater<ArrayValueType<ResolvedType<T, S>>> {
  return useMemo(
    () => ({
      insert(value: any, place?: InsertPlace): void {
        root.updateByPath(
          path,
          (arr: any) => {
            if (place) {
              if ("before" in place) {
                const idx = place.before;
                if (idx < 0) arr.push(value);
                else arr.splice(idx, 0, value);
              } else if ("after" in place) {
                const idx = place.after;
                if (idx < 0) arr.unshift(value);
                else arr.splice(idx + 1, 0, value);
              } else if ("head" in place) {
                arr.unshift(value);
              } else {
                throw new Error("invalid place: " + JSON.stringify(place));
              }
            } else {
              arr.push(value);
            }
            return arr;
          },
          true
        );
      },
      remove(idx: number): any {
        root.updateByPath(
          path,
          (arr: any) => {
            if (idx >= 0) arr.splice(idx, 1);
            return arr;
          },
          true
        );
      },
    }),
    [root, path]
  );
}

export function useTreeSnapshot<T, R = T>(
  ctx: Tree<T>,
  pick: (input: T) => R = (a: T) => a as never,
  eq: (a: R, b: R) => boolean = deepEqual
): R {
  const { subscribe, getSnapshot } = useMemo(() => {
    let value = pick(ctx.value);
    return {
      subscribe: (cb: () => void) =>
        ctx.on([], () => {
          try {
            const latest = pick(ctx.value);
            if (!eq(value, latest)) {
              value = latest;
              cb();
            }
          } catch (e) {
            console.error(e);
          }
        }),
      getSnapshot: () => value,
    };
  }, [ctx, pick, eq]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useLastPresentValue(value);
}

export type NullableTree<T extends {}> =
  | Tree<T | undefined>
  | Tree<T | null>
  | Tree<T | undefined | null>;

export function useNullableTree<T extends {}>(
  ctx: Tree<T | undefined>
): Tree<T> | null;
export function useNullableTree<T extends {}>(
  ctx: Tree<T | null>
): Tree<T> | null;
export function useNullableTree<T extends {}>(
  ctx: Tree<T | undefined | null>
): Tree<T> | null;
export function useNullableTree<T extends {}>(
  ctx: NullableTree<T>
): Tree<T> | null;
export function useNullableTree<T extends {}>(
  ctx: Tree<T | undefined | null>
): Tree<T> | null {
  const isNull = useTreeSnapshot(
    ctx as Tree<T | undefined | null>,
    (a) => a == null
  );
  return useMemo(
    () => (isNull ? null : new NonNullTree<T>(ctx as Tree<T>)),
    [ctx, isNull]
  );
}
