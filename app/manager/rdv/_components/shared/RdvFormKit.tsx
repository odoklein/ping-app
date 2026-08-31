"use client";

import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Check } from "lucide-react";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type RdvDialogProps = Omit<ComponentProps<typeof Modal>, "className"> & {
  className?: string;
};

export function RdvDialog({ className, ...props }: RdvDialogProps) {
  return <Modal {...props} className={cn("rdv-dialog", className)} />;
}

export function RdvDialogFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ModalFooter className={cn("rdv-dialog-footer", className)}>{children}</ModalFooter>;
}

export function RdvFormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rdv-form-section", className)}>
      <header className="rdv-form-section-heading">
        {Icon && <span className="rdv-form-section-icon"><Icon size={15} /></span>}
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className="rdv-form-section-body">{children}</div>
    </section>
  );
}

export function RdvField({
  label,
  hint,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rdv-field", className)}>
      <div className="rdv-field-heading">
        <label htmlFor={htmlFor}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
        {hint && <span>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function RdvNotice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "danger";
}) {
  return (
    <div className={`rdv-notice is-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      {tone === "success" ? <Check size={15} /> : <AlertCircle size={15} />}
      <div>{children}</div>
    </div>
  );
}

export function RdvStepRail({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="rdv-step-rail" aria-label="Progression">
      {steps.map((label, index) => {
        const number = index + 1;
        const state = number < current ? "done" : number === current ? "current" : "next";
        return (
          <li key={label} className={`is-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span>{state === "done" ? <Check size={12} /> : number}</span>
            <small>{label}</small>
          </li>
        );
      })}
    </ol>
  );
}
