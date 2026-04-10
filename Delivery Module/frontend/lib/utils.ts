export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function flattenPayload(
  payload: Record<string, unknown> | unknown[] | string | number | boolean | null,
  prefix = "",
): Record<string, string> {
  if (
    payload === null ||
    typeof payload === "string" ||
    typeof payload === "number" ||
    typeof payload === "boolean"
  ) {
    return prefix ? { [prefix]: String(payload) } : { payload: String(payload) };
  }

  if (Array.isArray(payload)) {
    return prefix ? { [prefix]: JSON.stringify(payload) } : { payload: JSON.stringify(payload) };
  }

  return Object.entries(payload).reduce<Record<string, string>>((accumulator, [key, value]) => {
    const compositeKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(
        accumulator,
        flattenPayload(value as Record<string, unknown>, compositeKey),
      );
      return accumulator;
    }

    accumulator[compositeKey] =
      value === null ? "null" : Array.isArray(value) ? JSON.stringify(value) : String(value);
    return accumulator;
  }, {});
}
