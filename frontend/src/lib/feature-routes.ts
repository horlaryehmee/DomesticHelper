export interface FeatureState {
  enabled: Record<string, boolean>;
  paths: Record<string, string[]>;
}
export function isPathEnabled(
  destination: string,
  state: FeatureState,
): boolean {
  const path = destination.split(/[?#]/)[0];
  return Object.entries(state.paths).every(
    ([key, patterns]) =>
      !patterns.some((pattern) =>
        new RegExp(
          "^" +
            pattern
              .split("*")
              .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              .join(".*") +
            "$",
        ).test(path),
      ) || state.enabled[key] === true,
  );
}

export function selectFeature(
  current: Record<string, boolean>,
  key: string,
  checked: boolean,
): Record<string, boolean> {
  return { ...current, [key]: checked };
}
