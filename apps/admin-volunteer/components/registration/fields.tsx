type TextFieldProps = {
  label: string;
  value: string;
  onChange(value: string): void;
  type?: string;
};

export function RegistrationInput({
  label,
  value,
  onChange,
  type = "text"
}: TextFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type={type}
        max={type === "date" ? new Date().toISOString().slice(0, 10) : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

type ChildNotesProps = {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
};

export function ChildNotes({
  label,
  value,
  onChange,
  placeholder
}: ChildNotesProps) {
  const guidance = getCareFieldGuidance(label);
  return (
    <div className="field">
      <label>
        {label}
        {guidance && <span className="optional-label"> (optional)</span>}
      </label>
      <textarea
        placeholder={placeholder || guidance?.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {guidance && <small className="help">{guidance.help}</small>}
    </div>
  );
}

function getCareFieldGuidance(label: string) {
  if (label === "Medical information") {
    return {
      placeholder:
        "Relevant conditions, medication instructions, or emergency guidance",
      help: "Share only information volunteers may need to care for the child. Leave blank if none."
    };
  }
  if (label === "Assistance needs") {
    return {
      placeholder:
        "Communication, sensory, mobility, toileting, or participation support",
      help: "Describe anything that helps the child participate comfortably. Leave blank if none."
    };
  }
  return null;
}
