import { FeatureLink as Link } from "@/components/feature-link";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Users,
  ArrowUpRight,
  Mail,
  FileCheck2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useFeatures } from "@/lib/features";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
interface Dashboard {
  data: {
    total_users?: number;
    pending_accounts?: number;
    pending_verifications?: number;
    profile_completion?: number;
  };
  verification_badges?: string[];
  recent_notifications?: {
    id: string;
    data: { title: string; body: string };
  }[];
}
export function WorkspaceDashboard() {
  const { user } = useAuth();
  const { enabled } = useFeatures();
  const base =
    user?.user_type === "admin"
      ? "/admin"
      : user?.user_type === "employer"
        ? "/employer"
        : "/helper";
  const admin = base === "/admin";
  const { data, isPending, error } = useQuery({
    queryKey: ["workspace-dashboard", user?.uuid],
    queryFn: () => api.get<Dashboard>("/dashboard"),
  });
  const destinations: Record<string, [string, string]> = {
    job_directory: [admin ? "/admin/jobs" : "/jobs", "Job directory"],
    job_posting: [
      admin
        ? "/admin/jobs"
        : user?.user_type === "employer"
          ? "/employer/jobs"
          : "/helper/applications",
      user?.user_type === "employer"
        ? "Post & manage jobs"
        : "Job applications",
    ],
    helper_directory: [admin ? "/admin/users" : "/search", "Helper listings"],
    community: [
      admin ? "/admin/community-experiences" : "/community",
      "Community stories",
    ],
    messaging: [base + "/messages", "Messages"],
    saved_helpers: ["/employer/saved-helpers", "Saved helpers"],
    employment: [base + "/employments", "Employment records"],
    interviews: [base + "/interviews", "Interviews"],
    reviews: [base + "/reviews", "Reviews"],
    reports: [base + "/reports", "Reports"],
    disputes: [base + "/disputes", "Disputes"],
    trust_scores: ["/admin/trust-scores", "Trust scores"],
    payments: ["/admin/payments", "Payments"],
    verification_reports: [
      "/employer/verification-reports",
      "Verification reports",
    ],
  };
  const modules = Object.entries(destinations)
    .filter(([key]) => enabled[key])
    .filter(([key]) =>
      admin
        ? ![
            "messaging",
            "saved_helpers",
            "employment",
            "interviews",
            "verification_reports",
          ].includes(key)
        : !["trust_scores", "payments"].includes(key) &&
          !(
            user?.user_type === "helper" &&
            ["saved_helpers", "verification_reports"].includes(key)
          ) &&
          !(user?.user_type === "employer" && key === "disputes"),
    );
  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Hire Safe workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {admin
            ? "Verification overview"
            : `Welcome back, ${user?.first_name}`}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {admin
            ? "Review accounts, check submitted details and manage the live platform."
            : "Manage your account details and follow your verification progress."}
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border p-4">
          We could not load the overview. Please reload to try again.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {(admin
          ? [
              ["Registered accounts", data?.data.total_users, "/admin/users"],
              [
                "Accounts awaiting approval",
                data?.data.pending_accounts,
                "/admin/verifications",
              ],
              [
                "Identity checks awaiting review",
                data?.data.pending_verifications,
                "/admin/verifications",
              ],
            ]
          : [
              [
                "Email confirmation",
                user?.email_verified ? "Confirmed" : "Pending",
                base + "/verification",
              ],
              [
                "Account approval",
                user?.approval_status === "approved"
                  ? "Approved"
                  : "Under review",
                base + "/verification",
              ],
              [
                "Verification checks",
                data?.verification_badges?.length ?? 0,
                base + "/verification",
              ],
            ]
        ).map(([title, value, path]) => (
          <Card key={String(title)}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{title}</p>
              <p className="mt-3 text-2xl font-semibold">
                {isPending ? "Loading..." : value}
              </p>
              <Link
                to={String(path)}
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                View details <ArrowUpRight className="size-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden bg-[#2d2039] text-white">
        <CardContent className="flex flex-col justify-between gap-6 py-8 sm:flex-row sm:items-center">
          <div>
            <ShieldCheck className="mb-4 size-8 text-[#efb39a]" />
            <h2 className="text-xl font-semibold">
              {admin
                ? "Every account deserves a careful review."
                : "Your details. Your verification record."}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
              {admin
                ? "Check identity, address documents and both guarantors before approving onboarding."
                : "Your identity documents and guarantor contacts stay private. Verification statuses show which checks have been reviewed."}
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 bg-white text-[#2d2039] hover:bg-white/90"
          >
            <Link to={admin ? "/admin/verifications" : base + "/verification"}>
              <FileCheck2 />
              {admin ? "Open verifications" : "My verification"}
            </Link>
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <Users className="size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-semibold">
                {admin ? "Account management" : "Account settings"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {admin
                  ? "View users and their submitted registration documents."
                  : "Manage your sign-in and account preferences."}
              </p>
              <Link
                to={admin ? "/admin/users" : base + "/settings"}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
              >
                Open <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <Mail className="size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-semibold">
                {admin ? "Contact enquiries" : "Need a hand?"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {admin
                  ? "Read and respond to enquiries sent through the website."
                  : "Contact the team about your account or verification."}
              </p>
              <Link
                to={admin ? "/admin/contact-inquiries" : "/contact"}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
              >
                {admin ? "View enquiries" : "Contact support"}{" "}
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      {modules.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Your tools</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(([key, [path, label]]) => (
              <Link
                key={key}
                to={path}
                className="flex items-center justify-between rounded-xl border bg-card p-5 text-sm font-medium transition-colors hover:bg-accent"
              >
                {label}
                <ArrowUpRight className="size-4" />
              </Link>
            ))}
          </div>
        </section>
      )}
      {!admin && !!data?.recent_notifications?.length && (
        <Card>
          <CardHeader>
            <CardTitle>Recent notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_notifications.map((notification) => (
              <div key={notification.id} className="rounded-xl border p-4">
                <p className="text-sm font-medium">{notification.data.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {notification.data.body}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
