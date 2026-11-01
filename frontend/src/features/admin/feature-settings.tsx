import { selectFeature } from "@/lib/feature-routes";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
interface Module {
  key: string;
  label: string;
  description: string;
  requires: string[];
}
interface Settings {
  enabled: Record<string, boolean>;
  modules: Module[];
}
export function FeatureSettings() {
  const client = useQueryClient();
  const [draft, setDraft] = useState<Record<string, boolean> | null>(null);
  const { data, error, isPending } = useQuery({
    queryKey: ["feature-settings"],
    queryFn: () => api.get<{ data: Settings }>("/admin/settings/features"),
    retry: false,
  });
  const values = draft ?? data?.data.enabled ?? {};
  const modules = data?.data.modules ?? [];
  const change = (key: string, on: boolean) =>
    setDraft(selectFeature(values, key, on));
  const missingRequirements = modules.filter(
    (module) =>
      values[module.key] &&
      module.requires.some((required) => !values[required]),
  );
  const save = useMutation({
    mutationFn: () =>
      api.put<{ data: Settings }>("/admin/settings/features", {
        features: values,
      }),
    onSuccess: async (result) => {
      setDraft(result.data.enabled);
      client.setQueryData(["feature-settings"], result);
      await client.invalidateQueries({ queryKey: ["platform-features"] });
      client.invalidateQueries({ queryKey: ["workspace-dashboard"] });
      client.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Live features updated");
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiError ? e.message : "Could not save feature switches",
      ),
  });
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Live features</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Tick the modules you want available. Unticked modules disappear from
          the public site, user dashboards and admin menus. Their API and
          data-entry actions are blocked too. Existing records are kept for when
          you enable the module again.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <strong>Always live:</strong> signup, Google/email login, email
          confirmation, onboarding with two guarantors, account approval,
          identity verification, account settings, notifications and contact
          support.
        </div>
        {isPending && <p>Loading feature switches...</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            Only the master admin can manage live features. Reload if your
            access was just updated.
          </p>
        )}
        {data && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium">
                {Object.values(values).filter(Boolean).length} optional modules
                selected
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDraft(
                    Object.fromEntries(
                      modules.map((module) => [module.key, false]),
                    ),
                  )
                }
              >
                Select verification-only setup
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {modules.map((module) => (
                <label
                  key={module.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${values[module.key] ? "border-primary/40 bg-primary/5" : "bg-background"}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-primary"
                    checked={!!values[module.key]}
                    disabled={save.isPending}
                    onChange={(event) =>
                      change(module.key, event.target.checked)
                    }
                  />
                  <span>
                    <span className="block text-sm font-semibold">
                      {module.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {module.description}
                    </span>
                    {module.requires.length > 0 && (
                      <span className="mt-2 block text-[11px] leading-5 text-muted-foreground">
                        Requires:{" "}
                        {module.requires
                          .map(
                            (key) =>
                              modules.find((item) => item.key === key)?.label ??
                              key,
                          )
                          .join(", ")}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              Each checkbox changes only that feature. Requirements must be
              selected separately. Nothing changes until you save.
            </p>
            {missingRequirements.length > 0 && (
              <div
                role="alert"
                className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
              >
                <p className="font-semibold">
                  Resolve these requirements before saving:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {missingRequirements.map((module) => (
                    <li key={module.key}>
                      {module.label} needs{" "}
                      {module.requires
                        .filter((key) => !values[key])
                        .map(
                          (key) =>
                            modules.find((item) => item.key === key)?.label ??
                            key,
                        )
                        .join(", ")}
                      . Select the requirement or untick {module.label}.
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              disabled={save.isPending || missingRequirements.length > 0}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving..." : "Save live features"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
