import { Check } from "@phosphor-icons/react";

export function Stepper({ steps, current }) {
  return (
    <ol className="stepper" aria-label="Progress">
      {steps.map((step, index) => (
        <li key={step} className={index === current ? "active" : index < current ? "complete" : ""}>
          <span>{index < current ? <Check size={14} weight="bold" /> : index + 1}</span>
          <small>{step}</small>
        </li>
      ))}
    </ol>
  );
}
