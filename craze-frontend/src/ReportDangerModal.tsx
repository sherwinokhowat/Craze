import { ReactElement, useState } from "react";

interface ReportDangerModalProps {
  onReport: (description: string, severity: number) => void;
}

export default function ReportDangerModal({
  onReport,
}: ReportDangerModalProps): ReactElement {
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<number>();

  return (
    <div className="flex flex-col p-2 gap-2 bg-white border-2 border-red-500 rounded-md">
      <h1 className="text-xl mx-auto">Report Danger</h1>
      <textarea
        placeholder="Description"
        className="p-2 w-48 border border-black rounded-sm"
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
        }}
      />
      <input
        type="number"
        placeholder="Severity"
        className="p-2 w-48 border border-black rounded-sm"
        value={severity}
        onChange={(e) => {
          setSeverity(Number(e.target.value));
        }}
      />
      <button
        className="p-2 bg-zinc-200 rounded-md"
        onClick={() => onReport(description, severity || 0)}
      >
        Report Danger
      </button>
    </div>
  );
}
