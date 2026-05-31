"use client";

import { useActionState, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, FileUp, Send } from "lucide-react";

type CompanyOption = {
  id: string;
  name: string;
  code: string;
  color: string;
};

type TechniqueOption = {
  id: string;
  code: string;
  label: string;
  description: string;
  defaultOwnerCompanyId: string | null;
};

type UserOption = {
  id: string;
  name: string;
  email: string;
  companyId: string;
};

type TechniqueAction = "template" | "assign" | "external";

type TechniqueConfig = {
  action: TechniqueAction;
  requestedCompanyId?: string;
  assigneeId?: string;
  instructions?: string;
};

type SubmitState = {
  error: string | null;
};

const steps = [
  "Company",
  "Customer",
  "Documents",
  "Techniques",
  "Routing",
  "Review",
  "Submit"
];

export function QuotationWizard({
  companies,
  techniques,
  technicalUsers,
  action
}: {
  companies: CompanyOption[];
  techniques: TechniqueOption[];
  technicalUsers: UserOption[];
  action: (state: SubmitState, formData: FormData) => Promise<SubmitState>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [serverState, formAction, isPending] = useActionState(action, { error: null });
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [requesterCompanyId, setRequesterCompanyId] = useState(companies[0]?.id ?? "");
  const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<string[]>([]);
  const [configs, setConfigs] = useState<Record<string, TechniqueConfig>>({});

  const selectedTechniques = useMemo(
    () => techniques.filter((technique) => selectedTechniqueIds.includes(technique.id)),
    [selectedTechniqueIds, techniques]
  );

  const techniquePayload = selectedTechniques.map((technique) => {
    const config = configs[technique.id] ?? defaultConfig(technique);
    return {
      techniqueId: technique.id,
      techniqueCode: technique.code,
      action: config.action,
      requestedCompanyId: config.requestedCompanyId,
      assigneeId: config.assigneeId,
      instructions: config.instructions
    };
  });

  function defaultConfig(technique: TechniqueOption): TechniqueConfig {
    return {
      action: "template",
      requestedCompanyId: technique.defaultOwnerCompanyId ?? requesterCompanyId,
      assigneeId: "",
      instructions: ""
    };
  }

  function updateConfig(technique: TechniqueOption, patch: Partial<TechniqueConfig>) {
    setConfigs((current) => ({
      ...current,
      [technique.id]: {
        ...(current[technique.id] ?? defaultConfig(technique)),
        ...patch
      }
    }));
  }

  function toggleTechnique(technique: TechniqueOption) {
    setSelectedTechniqueIds((current) => {
      if (current.includes(technique.id)) {
        return current.filter((id) => id !== technique.id);
      }
      setConfigs((configsById) => ({
        ...configsById,
        [technique.id]: configsById[technique.id] ?? defaultConfig(technique)
      }));
      return [...current, technique.id];
    });
  }

  function formData() {
    return formRef.current ? new FormData(formRef.current) : new FormData();
  }

  function validateStep(targetStep = step) {
    const data = formData();
    if (targetStep === 0 && !requesterCompanyId) {
      return "Select the requesting company.";
    }
    if (targetStep === 1) {
      const required = [
        "projectName",
        "projectDescription",
        "customer.companyName",
        "customer.contactName",
        "customer.street",
        "customer.postalCode",
        "customer.city"
      ];
      const missing = required.find((key) => !String(data.get(key) ?? "").trim());
      if (missing) {
        return "Complete the required customer and project fields.";
      }
    }
    if (targetStep === 3 && selectedTechniqueIds.length === 0) {
      return "Select at least one technique.";
    }
    if (targetStep === 4) {
      const missingAssignment = techniquePayload.some(
        (item) => item.action === "assign" && !item.requestedCompanyId
      );
      if (missingAssignment) {
        return "Choose a company for every assigned technical task.";
      }
      const missingExternalOffer = techniquePayload.some((item) => {
        if (item.action !== "external") {
          return false;
        }
        const file = data.get(`externalOffer.${item.techniqueId}`);
        return !(file instanceof File) || file.size === 0;
      });
      if (missingExternalOffer) {
        return "Upload an external technical offer for every external-offer technique.";
      }
    }
    return "";
  }

  function validateBeforeSubmit() {
    const validationSteps = [0, 1, 3, 4];
    for (const validationStep of validationSteps) {
      const message = validateStep(validationStep);
      if (message) {
        setStep(validationStep);
        return message;
      }
    }
    return "";
  }

  function nextStep() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const message = validateBeforeSubmit();
    if (message) {
      event.preventDefault();
      setError(message);
      return;
    }
    setError("");
  }

  const displayedError = error || serverState.error;

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      encType="multipart/form-data"
      className="grid gap-6"
      onSubmit={handleSubmit}
      aria-busy={isPending}
    >
      <input type="hidden" name="techniques" value={JSON.stringify(techniquePayload)} />

      <div className="panel p-4">
        <ol className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {steps.map((label, index) => (
            <li
              key={label}
              className={`rounded-md px-3 py-2 text-xs font-semibold ${
                index === step
                  ? "bg-ink text-white"
                  : index < step
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </div>

      {displayedError ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          aria-live="polite"
        >
          {displayedError}
        </div>
      ) : null}

      <section hidden={step !== 0} className="panel p-5">
        <p className="field-label">Step 1</p>
        <h2 className="mt-1 text-xl font-bold text-ink">Select requesting company</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {companies.map((company) => (
            <label
              key={company.id}
              className={`rounded-lg border p-4 transition ${
                requesterCompanyId === company.id
                  ? "border-ink bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name="requesterCompanyId"
                value={company.id}
                checked={requesterCompanyId === company.id}
                onChange={() => setRequesterCompanyId(company.id)}
              />
              <span className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: company.color }} />
                <span className="font-semibold text-ink">{company.name}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section hidden={step !== 1} className="panel p-5">
        <p className="field-label">Step 2</p>
        <h2 className="mt-1 text-xl font-bold text-ink">Customer and project data</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Project name" name="projectName" required />
          <Field label="Requested due date" name="requestedDueDate" type="date" />
          <div className="md:col-span-2">
            <label className="grid gap-1">
              <span className="field-label">Project description</span>
              <textarea name="projectDescription" className="field-textarea" required />
            </label>
          </div>
          <Field label="Customer company" name="customer.companyName" required />
          <Field label="VAT number" name="customer.vatNumber" />
          <Field label="Contact name" name="customer.contactName" required />
          <Field label="Contact email" name="customer.contactEmail" type="email" />
          <Field label="Phone" name="customer.phone" />
          <Field label="Street and number" name="customer.street" required />
          <Field label="Postal code" name="customer.postalCode" required />
          <Field label="City" name="customer.city" required />
        </div>
      </section>

      <section hidden={step !== 2} className="panel p-5">
        <p className="field-label">Step 3</p>
        <h2 className="mt-1 text-xl font-bold text-ink">Upload source documents</h2>
        <p className="mt-2 text-sm text-steel">
          Add customer quotations, technical offers, plans or specifications that should be used
          by the technical quotation makers.
        </p>
        <label className="mt-5 flex min-h-36 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <span>
            <FileUp className="mx-auto h-8 w-8 text-steel" aria-hidden="true" />
            <span className="mt-3 block text-sm font-semibold text-ink">Choose files</span>
            <span className="mt-1 block text-xs text-steel">PDF, images, Office documents or ZIP files</span>
            <input name="documents" type="file" multiple className="sr-only" />
          </span>
        </label>
      </section>

      <section hidden={step !== 3} className="panel p-5">
        <p className="field-label">Step 4</p>
        <h2 className="mt-1 text-xl font-bold text-ink">Select techniques</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {techniques.map((technique) => (
            <label
              key={technique.id}
              className={`rounded-lg border p-4 ${
                selectedTechniqueIds.includes(technique.id)
                  ? "border-ink bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selectedTechniqueIds.includes(technique.id)}
                onChange={() => toggleTechnique(technique)}
              />
              <span className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 place-items-center rounded border border-slate-300 bg-white">
                  {selectedTechniqueIds.includes(technique.id) ? (
                    <Check className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
                  ) : null}
                </span>
                <span>
                  <span className="block font-semibold text-ink">{technique.label}</span>
                  <span className="mt-1 block text-sm text-steel">{technique.description}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section hidden={step !== 4} className="grid gap-4">
        {selectedTechniques.map((technique) => {
          const config = configs[technique.id] ?? defaultConfig(technique);
          return (
            <div key={technique.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="field-label">Step 5</p>
                  <h2 className="mt-1 text-lg font-bold text-ink">{technique.label}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-steel">
                  {technique.code}
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {[
                  ["template", "Generate from template"],
                  ["assign", "Assign to quotation maker"],
                  ["external", "Upload external offer"]
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className={`rounded-md border p-3 text-sm font-semibold ${
                      config.action === value
                        ? "border-ink bg-slate-50 text-ink"
                        : "border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      checked={config.action === value}
                      onChange={() => updateConfig(technique, { action: value as TechniqueAction })}
                    />
                    {label}
                  </label>
                ))}
              </div>

              {config.action === "assign" ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="field-label">Requested company</span>
                    <select
                      className="field-control"
                      value={config.requestedCompanyId ?? ""}
                      onChange={(event) =>
                        updateConfig(technique, { requestedCompanyId: event.target.value })
                      }
                    >
                      <option value="">Choose company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="field-label">Assignee</span>
                    <select
                      className="field-control"
                      value={config.assigneeId ?? ""}
                      onChange={(event) => updateConfig(technique, { assigneeId: event.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {technicalUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {config.action === "external" ? (
                <label className="mt-4 grid gap-1">
                  <span className="field-label">External technical offer</span>
                  <input name={`externalOffer.${technique.id}`} type="file" className="field-control py-2" />
                </label>
              ) : null}

              <label className="mt-4 grid gap-1">
                <span className="field-label">Instructions</span>
                <textarea
                  className="field-textarea"
                  value={config.instructions ?? ""}
                  onChange={(event) => updateConfig(technique, { instructions: event.target.value })}
                  placeholder="Add details, assumptions, exclusions or questions for this technique."
                />
              </label>
            </div>
          );
        })}
      </section>

      <section hidden={step !== 5} className="panel p-5">
        <p className="field-label">Step 6</p>
        <h2 className="mt-1 text-xl font-bold text-ink">Review summary</h2>
        <div className="mt-5 grid gap-3">
          {selectedTechniques.map((technique) => {
            const config = configs[technique.id] ?? defaultConfig(technique);
            const company = companies.find((item) => item.id === config.requestedCompanyId);
            return (
              <div key={technique.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-ink">{technique.label}</strong>
                  <span className="text-sm font-semibold text-steel">{config.action}</span>
                </div>
                <p className="mt-2 text-sm text-steel">
                  {config.action === "assign"
                    ? `Technical task for ${company?.name ?? "unassigned company"}`
                    : config.action === "external"
                      ? "External technical offer will be attached if a file was selected."
                      : "A quotation section will be generated from the active template."}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section hidden={step !== 6} className="panel p-5">
        <p className="field-label">Step 7</p>
        <h2 className="mt-1 text-xl font-bold text-ink">Submit request and create tasks</h2>
        <p className="mt-2 max-w-2xl text-sm text-steel">
          Submitting creates the quotation request, stores uploaded documents, generates template
          sections and opens tasks for technical quotation makers.
        </p>
      </section>

      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" className="button-secondary" onClick={previousStep} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        {step < steps.length - 1 ? (
          <button type="button" className="button-primary" onClick={nextStep}>
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="submit" className="button-primary" disabled={isPending}>
            {isPending ? "Creating request..." : "Submit request"}
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <span className="field-label">{label}</span>
      <input name={name} type={type} required={required} className="field-control" />
    </label>
  );
}
