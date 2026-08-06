import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Common {
  label: string;
  help?: ReactNode;
  error?: string | null;
  required?: boolean;
}

export function Field({
  label,
  help,
  error,
  required,
  className,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="ml-1 text-gold">*</span>}
      </span>
      <input
        {...rest}
        aria-invalid={Boolean(error)}
        className={cn("field", error && "border-red-500 focus:border-red-500 focus:ring-red-500", className)}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-400">{error}</span>
      ) : help ? (
        <span className="mt-1 block text-xs text-cream/40">{help}</span>
      ) : null}
    </label>
  );
}

export function TextareaField({
  label,
  help,
  error,
  required,
  className,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="ml-1 text-gold">*</span>}
      </span>
      <textarea
        {...rest}
        aria-invalid={Boolean(error)}
        className={cn("field min-h-[90px] resize-y", error && "border-red-500", className)}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-400">{error}</span>
      ) : help ? (
        <span className="mt-1 block text-xs text-cream/40">{help}</span>
      ) : null}
    </label>
  );
}

/** Invisible to humans, irresistible to bots. */
export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
      <label>
        Company
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
