type QuerySource = { where?: string | string[] } & (
  | { from: { table: string } }
  | {
      join: {
        table: string;
        on: string | string[];
        type: "left" | "right" | "inner" | "full";
      };
    }
);

const escape = (s: string) => JSON.stringify(s);

function and(input: string | string[]) {
  if (Array.isArray(input)) return input.join(" AND ") || "true";
  return input;
}

function groupBy<T extends Record<string, any>, K extends string>(
  arr: T[],
  ...keys: K[]
) {
  const result = Object.fromEntries(keys.map((k) => [k, [] as T[]]));
  for (const item of arr)
    for (const key of keys) if (key in item) result[key].push(item);
  return result as unknown as { [k in K]: Extract<T, { [_ in k]: {} }>[] };
}

function as(name: string, alias: string) {
  if (name === alias) return name;
  return `${escape(name)} as ${alias}`;
}

export function jsonQb<
  F extends Record<string, QuerySource>,
  S extends Record<string, string>,
>(sources: F, select: S) {
  const json_object = Object.entries(select)
    .map(([k, v]) => `'${k}', json(${v})`)
    .join(", ");
  const parsed = groupBy(
    Object.entries(sources).map(([name, obj]) => ({ ...obj, name })),
    "from",
    "join"
  );
  const from = [
    ...parsed.from.map(({ name, from }) => as(from.table, name)),
    ...parsed.join.map(
      ({ name, join }) =>
        `${join.type.toUpperCase()} JOIN ${as(join.table, name)} ON ${and(join.on)}`
    ),
  ].join(" ");
  const where = and(Object.values(sources).flatMap((src) => src.where ?? []));
  return `SELECT json_object(${json_object}) AS json FROM ${from} WHERE ${where}`;
}

export function jsonAggQb<
  F extends Record<string, QuerySource>,
  S extends Record<string, string>,
>(sources: F, select: S) {
  const json_object = Object.entries(select)
    .map(([k, v]) => `'${k}', json(${v})`)
    .join(", ");
  const parsed = groupBy(
    Object.entries(sources).map(([name, obj]) => ({ ...obj, name })),
    "from",
    "join"
  );
  const from = [
    ...parsed.from.map(({ name, from }) => as(from.table, name)),
    ...parsed.join.map(
      ({ name, join }) =>
        `${join.type.toUpperCase()} JOIN ${as(join.table, name)} ON ${and(join.on)}`
    ),
  ].join(" ");
  const where = and(Object.values(sources).flatMap((src) => src.where ?? []));
  return `SELECT json_group_array(json_object(${json_object})) AS json FROM ${from} WHERE ${where}`;
}

export function qb<
  F extends Record<string, QuerySource>,
  S extends Record<string, string>,
>(sources: F, select: S) {
  const fields = Object.entries(select)
    .map(([k, v]) => `(${v}) AS ${escape(k)}`)
    .join(", ");
  const parsed = groupBy(
    Object.entries(sources).map(([name, obj]) => ({ ...obj, name })),
    "from",
    "join"
  );
  const from = [
    ...parsed.from.map(({ name, from }) => as(from.table, name)),
    ...parsed.join.map(
      ({ name, join }) =>
        `${join.type.toUpperCase()} JOIN ${as(join.table, name)} ON ${and(join.on)}`
    ),
  ].join(" ");
  const where = and(Object.values(sources).flatMap((src) => src.where ?? []));
  return `SELECT ${fields} FROM ${from} WHERE ${where}`;
}

export function subquery(queries: Record<string, string>) {
  const fields = Object.entries(queries)
    .map(([alias, query]) => `(${query}) AS ${alias}`)
    .join(", ");
  return `SELECT ${fields}`;
}
