import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "./api";
import { useAuth, accountPath } from "./auth";
import { isPathEnabled, type FeatureState } from "./feature-routes";
const Context = createContext<FeatureState | null>(null);
export function FeaturesProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: ["platform-features"],
    queryFn: () => api.get<FeatureState>("/features"),
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  if (!query.data)
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <p role={query.isError ? "alert" : "status"}>
          {query.isError
            ? "We could not load the site configuration. Please try again."
            : "Loading Hire Safe..."}
        </p>
        {query.isError && (
          <button
            className="font-medium underline"
            onClick={() => query.refetch()}
          >
            Try again
          </button>
        )}
      </div>
    );
  return <Context.Provider value={query.data}>{children}</Context.Provider>;
}
export function useFeatures() {
  const data = useContext(Context);
  if (!data) throw new Error("Feature controls require FeaturesProvider");
  const canVisit = (destination: string) => isPathEnabled(destination, data);
  return { ...data, canVisit };
}
export function Feature({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const { enabled } = useFeatures();
  return enabled[name] ? <>{children}</> : null;
}
export function FeatureRouteGate({ children }: { children: ReactNode }) {
  const { canVisit } = useFeatures();
  const location = useLocation();
  const { user } = useAuth();
  if (!canVisit(location.pathname))
    return <Navigate to={user ? accountPath(user) : "/"} replace />;
  return <>{children}</>;
}
