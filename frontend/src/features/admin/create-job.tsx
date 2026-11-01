import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useFeatures } from "@/lib/features";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function AdminCreateJob() {
  const { enabled } = useFeatures();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const client = useQueryClient();
  const employers = useQuery({
    queryKey: ["job-employers", search],
    queryFn: () =>
      api.get<{
        data: {
          uuid: string;
          name: string;
          status: string;
          approval_status: string;
        }[];
      }>("/admin/users", { type: "employer", q: search }),
    enabled: open && enabled.job_posting,
  });
  const create = useMutation({
    mutationFn: (body: Record<string, FormDataEntryValue>) =>
      api.post("/admin/jobs", body),
    onSuccess: () => {
      setOpen(false);
      setError("");
      client.invalidateQueries({ queryKey: ["admin-jobs"] });
      client.invalidateQueries({ queryKey: ["launch-jobs"] });
      toast.success("Job created");
    },
    onError: (failure) =>
      setError(
        failure instanceof ApiError ? failure.message : "Could not create job",
      ),
  });
  if (!enabled.job_posting) return null;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    create.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add job
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add a job</DialogTitle>
            <DialogDescription>
              Create a listing for an approved employer. Public visibility
              requires the Job directory switch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-2 text-sm">
              <span>Find employer</span>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Employer</span>
              <select
                name="employer_uuid"
                required
                className="h-11 w-full rounded-lg border bg-background px-3"
              >
                <option value="">Select an approved employer</option>
                {employers.data?.data
                  .filter(
                    (user) =>
                      user.status === "active" &&
                      user.approval_status === "approved",
                  )
                  .map((user) => (
                    <option key={user.uuid} value={user.uuid}>
                      {user.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["title", "Job title"],
                ["work_type", "Work type (e.g. nanny)"],
                ["state", "State"],
                ["city", "City / area"],
              ].map(([name, label]) => (
                <label key={name} className="block space-y-2 text-sm">
                  <span>{label}</span>
                  <Input
                    name={name}
                    required
                    maxLength={name === "title" ? 150 : 80}
                  />
                </label>
              ))}
              <label className="block space-y-2 text-sm">
                <span>Employment type</span>
                <select
                  name="employment_type"
                  className="h-11 w-full rounded-lg border bg-background px-3"
                >
                  <option value="full_time">Full time</option>
                  <option value="part_time">Part time</option>
                  <option value="live_in">Live in</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm">
                <span>Minimum monthly salary (NGN)</span>
                <Input name="salary_min" type="number" min={0} />
              </label>
            </div>
            <input type="hidden" name="salary_type" value="monthly" />
            <label className="block space-y-2 text-sm">
              <span>Job description</span>
              <Textarea
                name="description"
                required
                minLength={30}
                maxLength={8000}
                rows={5}
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Publication status</span>
              <select
                name="status"
                className="h-11 w-full rounded-lg border bg-background px-3"
              >
                <option value="draft">Save as draft</option>
                <option value="active">Publish active listing</option>
              </select>
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button disabled={create.isPending}>
              {create.isPending ? "Saving..." : "Save job"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
