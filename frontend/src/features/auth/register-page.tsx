import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Camera,
  Video,
  Check,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  LockKeyhole,
  UsersRound,
  UploadCloud,
  FileCheck2,
  BriefcaseBusiness,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError, setToken } from "@/lib/api";
import { useAuth, dashboardPath, type AuthUser } from "@/lib/auth";
import { useFeatures } from "@/lib/features";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Meta {
  skills: { id: number; name: string }[];
  states: string[];
  availability: { value: string; label: string }[];
  employment_types: { value: string; label: string }[];
}
const verificationShape = {
  nin: z.string().regex(/^\d{11}$/, "Enter your 11-digit NIN"),
  address_line: z
    .string()
    .trim()
    .min(1, "Enter your residential address")
    .max(255),
  guarantor_name: z
    .string()
    .trim()
    .min(1, "Enter the first guarantor?s full name")
    .max(120),
  guarantor_phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
  guarantor_relationship: z
    .string()
    .trim()
    .min(1, "Tell us how you know this person")
    .max(80),
  guarantor_2_name: z
    .string()
    .trim()
    .min(1, "Enter the second guarantor?s full name")
    .max(120),
  guarantor_2_phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
  guarantor_2_relationship: z
    .string()
    .trim()
    .min(1, "Tell us how you know this person")
    .max(80),
};
const employerSchema = z
  .object({
    ...verificationShape,
    profile_type: z.enum(["individual", "agency"]),
    agency_name: z.string().optional(),
    city: z.string().trim().min(1, "Enter your city").max(100),
    state: z.string().min(1, "Choose your state"),
  })
  .refine((data) => data.guarantor_phone !== data.guarantor_2_phone, {
    path: ["guarantor_2_phone"],
    message: "Use a different phone number for your second guarantor",
  })
  .refine(
    (data) => data.profile_type !== "agency" || !!data.agency_name?.trim(),
    { path: ["agency_name"], message: "Enter your agency name" },
  );
const helperSchema = z
  .object({
    ...verificationShape,
    date_of_birth: z.string().min(1, "Enter your date of birth"),
    gender: z.enum(["male", "female", "other"]),
    state: z.string().min(1, "Choose your state"),
    city: z.string().trim().min(1, "Enter your city").max(100),
    skills: z.array(z.number()).min(1, "Choose at least one skill"),
    years_experience: z.coerce.number().min(0).max(60),
    availability: z.string().min(1, "Choose your availability"),
    employment_type: z.string().optional(),
    expected_salary_min: z.coerce.number().min(0, "Enter a valid salary"),
    bio: z.string().max(1000).optional(),
  })
  .refine((data) => data.guarantor_phone !== data.guarantor_2_phone, {
    path: ["guarantor_2_phone"],
    message: "Use a different phone number for your second guarantor",
  });
type VerificationField = keyof typeof verificationShape;
type VerificationFieldsProps = {
  registerField: (name: VerificationField) => UseFormRegisterReturn;
  errors: Partial<Record<VerificationField, { message?: string }>>;
};
const identityFields = ["nin", "address_line"] as const;
const guarantorFields = [
  "guarantor_name",
  "guarantor_phone",
  "guarantor_relationship",
  "guarantor_2_name",
  "guarantor_2_phone",
  "guarantor_2_relationship",
] as const;
const employerSteps = [
  {
    label: "Your profile",
    title: "Tell us about your hiring needs.",
    detail: "A few details help us understand who is joining the network.",
  },
  {
    label: "Identity & address",
    title: "Let?s establish the essentials.",
    detail:
      "Your identity and address information is used for private verification.",
  },
  {
    label: "Two guarantors",
    title: "People who can vouch for you.",
    detail:
      "Add two different people who know you and can be contacted during review.",
  },
  {
    label: "Review & submit",
    title: "Take a moment to check.",
    detail:
      "Make sure everything is accurate before sending it to our review team.",
  },
];
const helperSteps = [
  {
    label: "Personal details",
    title: "Start with a little about you.",
    detail: "These details help us review your account and build your profile.",
  },
  {
    label: "Skills & experience",
    title: "Let your experience speak.",
    detail:
      "Help families understand the work you do and the opportunities you want.",
  },
  employerSteps[1],
  employerSteps[2],
  {
    label: "Photo & introduction",
    title: "Make a personal introduction.",
    detail:
      "A photo and short video can help families get to know you. Both are optional.",
  },
  employerSteps[3],
];

export function OnboardingPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const meta = useQuery({
    queryKey: ["meta"],
    queryFn: () => api.get<Meta>("/meta"),
  });
  if (!user) return <Navigate to="/register" replace />;
  if (user.approval_status === "approved")
    return <Navigate to={dashboardPath(user.user_type)} replace />;
  if (!user.email_verified) return <Navigate to="/verify-email" replace />;
  if (!user.details_confirmed)
    return <Navigate to="/confirm-details" replace />;
  if (user.approval_status === "pending")
    return <Navigate to="/approval-pending" replace />;
  if (!user.phone) return <GoogleContactStep />;
  if (meta.isPending)
    return (
      <div role="status" className="mx-auto max-w-xl px-6 py-24">
        <Spinner label="Preparing your onboarding..." />
      </div>
    );
  if (meta.isError)
    return (
      <div
        role="alert"
        className="mx-auto my-16 max-w-lg space-y-4 rounded-2xl border p-8"
      >
        <h1 className="text-xl font-semibold">
          We couldn?t load your onboarding options.
        </h1>
        <p className="text-sm text-muted-foreground">
          Please try again to load states, skills and availability.
        </p>
        <Button onClick={() => meta.refetch()}>Try again</Button>
      </div>
    );
  const onDone = (account: AuthUser) => {
    setUser(account);
    navigate("/approval-pending");
  };
  return user.user_type === "employer" ? (
    <EmployerForm meta={meta.data} onDone={onDone} />
  ) : (
    <HelperForm meta={meta.data} onDone={onDone} />
  );
}

function OnboardingFrame({
  steps,
  current,
  children,
  error,
}: {
  steps: typeof employerSteps;
  current: number;
  children: ReactNode;
  error: string;
}) {
  const { user } = useAuth();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [current]);
  return (
    <div className="bg-[#f7f4ef] px-4 py-8 text-[#2d2039] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6b5b]">
              Your Hire Safe journey
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              A strong start begins with you.
            </h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c8d9cc] bg-[#eef5ef] px-4 py-2 text-xs font-medium text-[#3d694a]">
            <ShieldCheck className="size-4" /> Email verified
          </span>
        </div>
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-7">
          <aside className="flex flex-col rounded-3xl bg-[#2d2039] p-6 text-white lg:p-7">
            <div className="mb-7 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/10">
                <BriefcaseBusiness className="size-5 text-[#f1b49d]" />
              </span>
              <div>
                <p className="text-xs text-white/55">Setting up your account</p>
                <p className="mt-1 text-sm font-medium capitalize">
                  {user?.user_type} onboarding
                </p>
              </div>
            </div>
            <ol
              aria-label="Onboarding progress"
              className="grid grid-cols-2 gap-4 lg:grid-cols-1"
            >
              {steps.map((step, index) => (
                <li
                  key={step.label}
                  aria-current={index === current ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-3 text-sm",
                    index > current ? "text-white/40" : "text-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      index < current
                        ? "border-[#f1b49d] bg-[#f1b49d] text-[#2d2039]"
                        : index === current
                          ? "border-[#f1b49d] bg-white/10 text-[#f1b49d]"
                          : "border-white/15",
                    )}
                  >
                    {index < current ? (
                      <Check className="size-4" />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <span>
                    {step.label}
                    {index === current && (
                      <span className="mt-0.5 block text-[10px] text-[#f1b49d]">
                        You are here
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-8 hidden border-t border-white/15 pt-6 lg:mt-auto lg:block lg:pt-7">
              <LockKeyhole className="mb-3 size-5 text-[#f1b49d]" />
              <p className="text-sm font-medium">Private where it matters.</p>
              <p className="mt-2 text-xs leading-6 text-white/55">
                Your NIN, address document and guarantor contacts are shared
                with authorised reviewers, not on your public profile.
              </p>
            </div>
          </aside>
          <section className="min-w-0 rounded-3xl border border-[#e7e0da] bg-white p-5 shadow-sm sm:p-8 lg:p-10">
            <div className="mb-7 flex items-center justify-between text-xs text-[#827589]">
              <span>
                Step {current + 1} of {steps.length}
              </span>
              <span>
                {Math.round((current / steps.length) * 100)}% complete
              </span>
            </div>
            <div
              className="mb-8 h-1.5 overflow-hidden rounded-full bg-[#f1ece7]"
              role="progressbar"
              aria-label="Onboarding completion"
              aria-valuenow={current}
              aria-valuemin={0}
              aria-valuemax={steps.length}
            >
              <div
                className="h-full rounded-full bg-[#c28a6a] transition-[width] motion-reduce:transition-none"
                style={{ width: `${(current / steps.length) * 100}%` }}
              />
            </div>
            <h2
              ref={heading}
              tabIndex={-1}
              className="text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl"
            >
              {steps[current].title}
            </h2>
            <p className="mt-3 mb-8 max-w-xl text-sm leading-6 text-[#827589]">
              {steps[current].detail}
            </p>
            {user?.approval_notes && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <strong>Changes requested:</strong> {user.approval_notes}
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            {children}
          </section>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-[#827589]">
          <FileCheck2 className="size-4 shrink-0" /> Dashboard access opens
          after your onboarding is approved by an admin.
        </p>
      </div>
    </div>
  );
}

function EmployerForm({
  meta,
  onDone,
}: {
  meta: Meta;
  onDone: (u: AuthUser) => void;
}) {
  const [step, setStep] = useState(0);
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    setError: fieldError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(employerSchema),
    defaultValues: { profile_type: "individual", state: "", agency_name: "" },
  });
  const values = watch();
  const next = async () => {
    const fields = [
      ["profile_type", "agency_name", "state", "city"],
      [...identityFields],
      [...guarantorFields],
    ][step];
    if (!(await trigger(fields as never))) return;
    if (step === 1 && !proof) {
      setError("Upload a proof of address to continue.");
      return;
    }
    setError("");
    setStep(step + 1);
  };
  const submit = async (data: z.infer<typeof employerSchema>) => {
    if (!proof) {
      setStep(1);
      setError("Upload a proof of address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (
          value !== undefined &&
          !(key === "agency_name" && data.profile_type !== "agency")
        )
          form.append(key, String(value));
      });
      form.append("address_proof", proof);
      const result = await api.upload<{ token: string; user: AuthUser }>(
        "/onboarding/employer",
        form,
      );
      setToken(result.token);
      toast.success("Submitted for admin review");
      onDone(result.user);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not submit your onboarding. Please try again.",
      );
      if (e instanceof ApiError && e.errors) {
        for (const [key, messages] of Object.entries(e.errors))
          fieldError(key as never, { message: messages[0] });
        setStep(
          Object.keys(e.errors).some((key) => key.startsWith("guarantor"))
            ? 2
            : e.errors.nin || e.errors.address_proof || e.errors.address_line
              ? 1
              : 0,
        );
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <OnboardingFrame steps={employerSteps} current={step} error={error}>
      <form
        onSubmit={(event) => {
          if (step < employerSteps.length - 1) {
            event.preventDefault();
            void next();
            return;
          }
          void handleSubmit(submit, () => {
            setError("Please check the details marked in the form.");
            setStep(0);
          })(event);
        }}
        className="space-y-7"
      >
        {step === 0 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="mb-3 text-sm font-medium">
                How are you hiring?
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["individual", "agency"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={values.profile_type === type}
                    onClick={() => setValue("profile_type", type)}
                    className={cn(
                      "rounded-xl border p-5 text-left transition-colors",
                      values.profile_type === type
                        ? "border-[#936349] bg-[#fcf5ef]"
                        : "border-[#e7e0da] hover:bg-[#faf8f5]",
                    )}
                  >
                    <span className="text-sm font-semibold">
                      {type === "individual"
                        ? "For my household"
                        : "For an agency"}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-[#827589]">
                      {type === "individual"
                        ? "Find the right support for your home."
                        : "Hire and manage staff for your clients."}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            {values.profile_type === "agency" && (
              <Field label="Agency name" error={errors.agency_name?.message}>
                <Input
                  {...register("agency_name")}
                  autoComplete="organization"
                />
              </Field>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="State" error={errors.state?.message}>
                <NativeSelect {...register("state")}>
                  <option value="">Choose your state</option>
                  {meta.states.map((state) => (
                    <option key={state}>{state}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="City / area" error={errors.city?.message}>
                <Input
                  {...register("city")}
                  placeholder="e.g. Lekki"
                  autoComplete="address-level2"
                />
              </Field>
            </div>
          </div>
        )}
        {step === 1 && (
          <IdentityFields
            registerField={(name) => register(name)}
            errors={errors}
            proof={proof}
            setProof={setProof}
          />
        )}
        {step === 2 && (
          <GuarantorFields
            registerField={(name) => register(name)}
            errors={errors}
          />
        )}
        {step === 3 && (
          <ReviewDetails
            values={values}
            proof={proof}
            onEdit={setStep}
            identityStep={1}
            guarantorStep={2}
            profileStep={0}
          />
        )}
        <WizardActions
          current={step}
          total={employerSteps.length}
          busy={busy}
          onBack={() => {
            setError("");
            setStep(step - 1);
          }}
          onNext={next}
        />
      </form>
    </OnboardingFrame>
  );
}

function HelperForm({
  meta,
  onDone,
}: {
  meta: Meta;
  onDone: (u: AuthUser) => void;
}) {
  const { enabled } = useFeatures();
  const directory = enabled.helper_directory;
  const steps = directory ? helperSteps : [helperSteps[0], { label: "Location", title: "Where do you live?", detail: "Add your state and city to support your address verification." }, helperSteps[2], helperSteps[3], helperSteps[5]];
  const [rawStep, setStep] = useState(0);
  const step = Math.min(rawStep, steps.length - 1);
  const [proof, setProof] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    setError: fieldError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(directory ? helperSchema : helperSchema.safeExtend({ skills: z.array(z.number()) })),
    defaultValues: {
      skills: [],
      gender: "female",
      employment_type: "any",
      state: "",
      availability: directory ? "" : "negotiable",
      years_experience: 0,
      expected_salary_min: 0,
    },
  });
  const values = watch();
  const next = async () => {
    const fields = [
      ["date_of_birth", "gender"],
      [
        "state",
        "city",
        "years_experience",
        "expected_salary_min",
        "skills",
        "availability",
        "employment_type",
        "bio",
      ],
      [...identityFields],
      [...guarantorFields],
      [],
    ][step];
    const activeFields = !directory && step === 1 ? ["state", "city"] : fields;
    if (!(await trigger(activeFields as never))) return;
    if (step === 2 && !proof) {
      setError("Upload a proof of address to continue.");
      return;
    }
    setError("");
    setStep(step + 1);
  };
  const submit = async (data: z.infer<typeof helperSchema>) => {
    if (!proof) {
      setStep(2);
      setError("Upload a proof of address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (!directory && ["skills", "years_experience", "expected_salary_min", "availability", "employment_type", "bio"].includes(key)) return;
        if (value === undefined) return;
        if (key === "skills")
          (value as number[]).forEach((id) =>
            form.append("skills[]", String(id)),
          );
        else form.append(key, String(value));
      });
      form.append("address_proof", proof);
      if (directory && photo) form.append("photo", photo);
      if (directory && video) form.append("intro_video", video);
      const result = await api.upload<{ token: string; user: AuthUser }>(
        "/onboarding/helper",
        form,
      );
      setToken(result.token);
      toast.success("Submitted for admin review");
      onDone(result.user);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not submit your onboarding. Please try again.",
      );
      if (e instanceof ApiError && e.errors) {
        for (const [key, messages] of Object.entries(e.errors))
          fieldError(key as never, { message: messages[0] });
        setStep(
          Object.keys(e.errors).some((key) => key.startsWith("guarantor"))
            ? 3
            : e.errors.nin || e.errors.address_line || e.errors.address_proof
              ? 2
              : e.errors.date_of_birth || e.errors.gender
                ? 0
                : e.errors.photo || e.errors.intro_video
                  ? 4
                  : 1,
        );
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <OnboardingFrame steps={steps} current={step} error={error}>
      <form
        onSubmit={(event) => {
          if (step < steps.length - 1) {
            event.preventDefault();
            void next();
            return;
          }
          void handleSubmit(submit, () => {
            setError("Please check the details marked in the form.");
            setStep(0);
          })(event);
        }}
        className="space-y-7"
      >
        {step === 0 && (
          <div className="space-y-6">
            <div className="rounded-xl bg-[#faf6f1] p-5">
              <p className="text-sm font-medium">
                A profile that?s truly yours.
              </p>
              <p className="mt-2 text-xs leading-6 text-[#827589]">
                Use details that match your identity documents. Your full date
                of birth is not shown on your public profile.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Date of birth"
                error={errors.date_of_birth?.message}
              >
                <Input type="date" {...register("date_of_birth")} />
              </Field>
              <Field label="Gender" error={errors.gender?.message}>
                <NativeSelect {...register("gender")}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </NativeSelect>
              </Field>
            </div>
            <p className="text-xs text-[#827589]">
              You must be at least 18 years old to register as a helper.
            </p>
          </div>
        )}
        {step === 1 && directory && (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="State" error={errors.state?.message}>
                <NativeSelect {...register("state")}>
                  <option value="">Choose your state</option>
                  {meta.states.map((state) => (
                    <option key={state}>{state}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="City / area" error={errors.city?.message}>
                <Input {...register("city")} autoComplete="address-level2" />
              </Field>
              <Field
                label="Years of experience"
                error={errors.years_experience?.message}
              >
                <Input
                  type="number"
                  min={0}
                  max={60}
                  {...register("years_experience")}
                />
              </Field>
              <Field
                label="Minimum monthly salary (NGN)"
                error={errors.expected_salary_min?.message}
              >
                <Input
                  type="number"
                  min={0}
                  {...register("expected_salary_min")}
                />
              </Field>
              <Field
                label="When can you start?"
                error={errors.availability?.message}
              >
                <NativeSelect {...register("availability")}>
                  <option value="">Choose availability</option>
                  {meta.availability.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Employment type">
                <NativeSelect {...register("employment_type")}>
                  {meta.employment_types
                    .filter((item) => item.value !== "other")
                    .map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                </NativeSelect>
              </Field>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">
                Your skills{" "}
                <span className="font-normal text-[#827589]">
                  (choose at least one)
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {meta.skills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    aria-pressed={values.skills.includes(skill.id)}
                    onClick={() =>
                      setValue(
                        "skills",
                        values.skills.includes(skill.id)
                          ? values.skills.filter((id) => id !== skill.id)
                          : [...values.skills, skill.id],
                        { shouldValidate: true },
                      )
                    }
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition-colors",
                      values.skills.includes(skill.id)
                        ? "border-[#2d2039] bg-[#2d2039] text-white"
                        : "border-[#e7e0da] hover:bg-[#faf6f1]",
                    )}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
              {errors.skills && (
                <p role="alert" className="mt-2 text-xs text-red-600">
                  {errors.skills.message}
                </p>
              )}
            </fieldset>
            <Field
              label="A little about your work (optional)"
              error={errors.bio?.message}
            >
              <Textarea
                rows={4}
                maxLength={1000}
                placeholder="Tell families about your experience and what you do well."
                {...register("bio")}
              />
            </Field>
          </div>
        )}
        {step === 1 && !directory && <div className="grid gap-5 sm:grid-cols-2"><Field label="State" error={errors.state?.message}><NativeSelect {...register('state')}><option value="">Choose your state</option>{meta.states.map(state=><option key={state}>{state}</option>)}</NativeSelect></Field><Field label="City / area" error={errors.city?.message}><Input {...register('city')} autoComplete="address-level2"/></Field></div>}
        {step === 2 && (
          <IdentityFields
            registerField={(name) => register(name)}
            errors={errors}
            proof={proof}
            setProof={setProof}
          />
        )}
        {step === 3 && (
          <GuarantorFields
            registerField={(name) => register(name)}
            errors={errors}
          />
        )}
        {step === 4 && directory && (
          <ProfileMediaFields
            photo={photo}
            onPhotoChange={setPhoto}
            video={video}
            onVideoChange={setVideo}
          />
        )}
        {step === (directory ? 5 : 4) && (
          <>
            <ReviewDetails
              values={{
                ...values,
                ...(!directory ? { skills: undefined, years_experience: undefined, expected_salary_min: undefined } : {}),
                skills: directory ? meta.skills
                  .filter((skill) => values.skills.includes(skill.id))
                  .map((skill) => skill.name)
                  .join(", ") : undefined,
              }}
              proof={proof}
              onEdit={setStep}
              identityStep={2}
              guarantorStep={3}
              profileStep={1}
            />
            {directory && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7e0da] p-4 text-sm">
              <span>
                Introduction: {photo ? "Photo added" : "No photo"} /{" "}
                {video ? "Video added" : "No video"}
              </span>
              <button
                type="button"
                className="font-medium underline"
                onClick={() => setStep(4)}
              >
                Edit introduction
              </button>
            </div>}
          </>
        )}
        <WizardActions
          current={step}
          total={steps.length}
          busy={busy}
          onBack={() => {
            setError("");
            setStep(step - 1);
          }}
          onNext={next}
        />
      </form>
    </OnboardingFrame>
  );
}

function WizardActions({
  current,
  total,
  busy,
  onBack,
  onNext,
}: {
  current: number;
  total: number;
  busy: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#eee8e2] pt-6">
      {current > 0 ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onBack}
        >
          <ArrowLeft /> Back
        </Button>
      ) : (
        <span className="text-xs text-[#827589]">Let?s get started.</span>
      )}
      {current < total - 1 ? (
        <Button key="next" type="button" onClick={onNext}>
          Continue <ArrowRight />
        </Button>
      ) : (
        <Button key="submit" type="submit" disabled={busy}>
          {busy ? (
            <Spinner label="Submitting..." />
          ) : (
            <>
              Submit for review <ArrowRight />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <label className="block space-y-2 text-sm">
      <span className="block font-medium text-[#4d3d58]">{label}</span>
      <span className="block [&_input]:min-h-11 [&_input]:rounded-xl [&_input]:border-[#ddd4e0] [&_input]:bg-white [&_input]:text-[#2d2039] [&_textarea]:rounded-xl [&_textarea]:border-[#ddd4e0] [&_textarea]:bg-white [&_textarea]:text-[#2d2039]">
        {Children.map(children, (child) =>
          isValidElement(child) &&
          (child.type === Input ||
            child.type === Textarea ||
            child.type === NativeSelect)
            ? cloneElement(
                child as ReactElement<{
                  "aria-invalid"?: boolean;
                  "aria-describedby"?: string;
                }>,
                {
                  "aria-invalid": !!error,
                  "aria-describedby": error ? id : undefined,
                },
              )
            : child,
        )}
      </span>
      {error && (
        <span id={id} role="alert" className="block text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
function NativeSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="min-h-11 w-full rounded-xl border border-[#ddd4e0] bg-white px-3 text-sm text-[#2d2039] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    />
  );
}
function IdentityFields({
  registerField,
  errors,
  proof,
  setProof,
}: VerificationFieldsProps & {
  proof: File | null;
  setProof: (file: File | null) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-xl bg-[#f5f1f8] p-4 text-xs leading-6 text-[#786a82]">
        <LockKeyhole className="mt-1 size-4 shrink-0" />
        <p>
          These details are private. Enter your NIN exactly as it appears on
          your document.
        </p>
      </div>
      <Field label="NIN (11 digits)" error={errors.nin?.message}>
        <Input
          inputMode="numeric"
          maxLength={11}
          autoComplete="off"
          {...registerField("nin")}
          placeholder="Your 11-digit identity number"
        />
      </Field>
      <Field label="Residential address" error={errors.address_line?.message}>
        <Input
          {...registerField("address_line")}
          autoComplete="street-address"
          placeholder="House number, street and area"
        />
      </Field>
      <div className="rounded-2xl border-2 border-dashed border-[#ded2c5] bg-[#fcf9f5] p-5">
        <UploadCloud className="mb-3 size-7 text-[#936349]" />
        <Field label="Proof of address">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file && file.size > 5 * 1024 * 1024) {
                toast.error("Address document must be 5 MB or smaller.");
                event.target.value = "";
                return;
              }
              setProof(file);
            }}
          />
        </Field>
        <p className="mt-3 text-xs leading-5 text-[#827589]">
          Upload a utility bill or another address document. PDF, JPG, PNG or
          WebP, up to 5 MB.
        </p>
        {proof && (
          <p className="mt-3 flex items-center gap-2 break-all text-xs font-medium text-[#3d694a]">
            <Check className="size-4 shrink-0" /> Selected: {proof.name}
          </p>
        )}
      </div>
    </div>
  );
}
function GuarantorFields({ registerField, errors }: VerificationFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-[#faf6f1] p-4 text-xs leading-6 text-[#827589]">
        <UsersRound className="mt-1 size-5 shrink-0 text-[#936349]" />
        <p>
          Choose two different people and let them know you are listing them as
          guarantors. Each needs a separate contact number. Their details stay
          private.
        </p>
      </div>
      {[1, 2].map((number) => {
        const prefix = number === 1 ? "guarantor" : "guarantor_2";
        const name = `${prefix}_name` as VerificationField;
        const phone = `${prefix}_phone` as VerificationField;
        const relationship = `${prefix}_relationship` as VerificationField;
        return (
          <fieldset
            key={number}
            className="rounded-2xl border border-[#e7e0da] p-5"
          >
            <legend className="px-2 text-sm font-semibold">
              Guarantor {number}
            </legend>
            <div className="space-y-5">
              <Field label="Full name" error={errors[name]?.message}>
                <Input
                  {...registerField(name)}
                  maxLength={120}
                  autoComplete="off"
                  placeholder="First and last name"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Phone number" error={errors[phone]?.message}>
                  <Input
                    {...registerField(phone)}
                    type="tel"
                    maxLength={16}
                    autoComplete="off"
                    placeholder="e.g. 08030000000"
                  />
                </Field>
                <Field
                  label="Relationship to you"
                  error={errors[relationship]?.message}
                >
                  <Input
                    {...registerField(relationship)}
                    maxLength={80}
                    autoComplete="off"
                    placeholder="e.g. Former employer"
                  />
                </Field>
              </div>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
function ReviewDetails({
  values,
  proof,
  onEdit,
  identityStep,
  guarantorStep,
  profileStep,
}: {
  values: Record<string, unknown>;
  proof: File | null;
  onEdit: (step: number) => void;
  identityStep: number;
  guarantorStep: number;
  profileStep: number;
}) {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <ReviewBlock title="Profile" onEdit={() => onEdit(profileStep)}>
        <p className="font-medium">{user?.name}</p>
        <p>{user?.email}</p>
        <p>{[values.city, values.state].filter(Boolean).join(", ")}</p>
        {!!values.profile_type && (
          <p className="capitalize">
            {String(values.profile_type)}
            {values.agency_name ? ` / ${values.agency_name}` : ""}
          </p>
        )}
        {!!values.skills && <p>Skills: {String(values.skills)}</p>}
        {!!values.date_of_birth && (
          <p>Date of birth: {String(values.date_of_birth)}</p>
        )}
        {values.years_experience !== undefined && (
          <p>Experience: {String(values.years_experience)} years</p>
        )}
        {values.expected_salary_min !== undefined && (
          <p>
            Minimum monthly salary: NGN {String(values.expected_salary_min)}
          </p>
        )}
      </ReviewBlock>
      <ReviewBlock
        title="Identity & address"
        onEdit={() => onEdit(identityStep)}
      >
        <p>NIN ending in {String(values.nin ?? "").slice(-4)}</p>
        <p>{String(values.address_line ?? "")}</p>
        <p className="break-all">Document: {proof?.name ?? "Not uploaded"}</p>
      </ReviewBlock>
      <ReviewBlock title="Two guarantors" onEdit={() => onEdit(guarantorStep)}>
        {[1, 2].map((number) => (
          <div
            key={number}
            className={
              number === 2 ? "mt-3 border-t border-[#eee8e2] pt-3" : ""
            }
          >
            <p className="font-medium">
              {number}.{" "}
              {String(
                values[number === 1 ? "guarantor_name" : "guarantor_2_name"] ??
                  "",
              )}
            </p>
            <p>
              {String(
                values[
                  number === 1 ? "guarantor_phone" : "guarantor_2_phone"
                ] ?? "",
              )}{" "}
              /{" "}
              {String(
                values[
                  number === 1
                    ? "guarantor_relationship"
                    : "guarantor_2_relationship"
                ] ?? "",
              )}
            </p>
          </div>
        ))}
      </ReviewBlock>
      <p className="rounded-xl bg-[#f5f1f8] p-4 text-xs leading-6 text-[#786a82]">
        By submitting, you confirm these details are accurate. Our team will
        review your onboarding. If more information is needed, you can update
        and resubmit before approval.
      </p>
    </div>
  );
}
function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e7e0da] p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium underline underline-offset-4"
          aria-label={`Edit ${title.toLowerCase()}`}
        >
          Edit
        </button>
      </div>
      <div className="space-y-1 break-words text-sm leading-6 text-[#827589]">
        {children}
      </div>
    </section>
  );
}

function ProfileMediaFields({
  photo,
  onPhotoChange,
  video,
  onVideoChange,
}: {
  photo: File | null;
  onPhotoChange: (file: File | null) => void;
  video: File | null;
  onVideoChange: (file: File | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = photo ? URL.createObjectURL(photo) : null;
    setPhotoUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo]);
  useEffect(() => {
    const url = video ? URL.createObjectURL(video) : null;
    setVideoUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [video]);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  useEffect(() => {
    if (recording && cameraRef.current && streamRef.current) {
      cameraRef.current.srcObject = streamRef.current;
      void cameraRef.current.play();
    }
  }, [recording]);

  const stopRecording = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
  };

  const startRecording = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error(
        "Camera recording is unavailable in this browser. Upload a video instead.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const mimeType = ["video/mp4", "video/webm"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        toast.error("Video recording is unsupported. Upload a video instead.");
        return;
      }
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const file = new File(
          chunks,
          `introduction.${mimeType === "video/mp4" ? "mp4" : "webm"}`,
          { type: mimeType },
        );
        if (file.size > 20 * 1024 * 1024)
          toast.error(
            "Video must be 20 MB or smaller. Please record a shorter clip.",
          );
        else if (file.size) onVideoChange(file);
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      recorder.start();
      setRecording(true);
      timerRef.current = setTimeout(stopRecording, 30000);
    } catch {
      toast.error(
        "Could not access your camera and microphone. You can upload a video instead.",
      );
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold">Show families who you are</h3>
        <p className="text-sm text-muted-foreground">
          Add a clear profile picture and a short introduction about the work
          you do. Both appear on your public profile. You can skip either for
          now.
        </p>
      </div>
      <Field label="Profile picture (JPG, PNG or WebP, max 2 MB)">
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file && file.size > 2 * 1024 * 1024) {
              toast.error("Picture must be 2 MB or smaller");
              event.target.value = "";
              return;
            }
            onPhotoChange(file);
          }}
        />
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Your selected profile"
            className="mt-3 size-28 rounded-xl object-cover"
          />
        )}
      </Field>
      <Field label="Introduction video (MP4, WebM or MOV, max 20 MB)">
        <Input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file && file.size > 20 * 1024 * 1024) {
              toast.error("Video must be 20 MB or smaller");
              event.target.value = "";
              return;
            }
            onVideoChange(file);
          }}
        />
      </Field>
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Or record up to 30 seconds using your camera and microphone.
        </p>
        {recording && (
          <video
            ref={cameraRef}
            muted
            playsInline
            autoPlay
            className="mb-3 w-full rounded-lg bg-black"
          />
        )}
        <Button
          type="button"
          variant="outline"
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? (
            <>
              <Video /> Stop recording
            </>
          ) : (
            <>
              <Camera /> Record introduction
            </>
          )}
        </Button>
      </div>
      {videoUrl && (
        <div>
          <p className="mb-2 text-sm font-medium">Preview: {video?.name}</p>
          <video
            src={videoUrl}
            controls
            className="w-full rounded-lg bg-black"
          />
        </div>
      )}
    </div>
  );
}

function GoogleContactStep() {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const steps = [
    {
      label: "Contact details",
      title: "Let?s complete your account.",
      detail:
        "Your Google account is connected. Confirm your name and add your phone number before building your profile.",
    },
  ];
  return (
    <OnboardingFrame steps={steps} current={0} error={error}>
      <form
        className="space-y-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await api.post<{ user: AuthUser }>(
              "/onboarding/contact",
              { phone, first_name: firstName, last_name: lastName },
            );
            setUser(result.user);
          } catch (failure) {
            setError(
              failure instanceof ApiError
                ? failure.message
                : "Could not save your contact details.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name">
            <Input
              required
              maxLength={60}
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </Field>
          <Field label="Last name">
            <Input
              required
              maxLength={60}
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Phone number">
          <Input
            type="tel"
            autoComplete="tel"
            pattern="[+]?[0-9]{10,15}"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="e.g. 08030000000"
          />
        </Field>
        <div className="flex justify-end border-t border-[#eee8e2] pt-6">
          <Button disabled={busy}>
            {busy ? "Saving..." : "Continue to your profile"} <ArrowRight />
          </Button>
        </div>
      </form>
    </OnboardingFrame>
  );
}
