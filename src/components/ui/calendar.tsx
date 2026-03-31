// @ts-nocheck
import * as React from "react";

export type CalendarProps = {
  mode?: "single" | "range" | "multiple";
  selected?: Date | Date[] | { from?: Date; to?: Date } | undefined;
  onSelect?: (date: any) => void;
  disabled?: ((date: Date) => boolean) | Date[];
  initialFocus?: boolean;
  className?: string;
  [key: string]: any;
};

export function Calendar({ className, ...props }: CalendarProps) {
  const { selected, onSelect, disabled } = props;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onSelect) {
      onSelect(val ? new Date(val) : undefined);
    }
  };

  const selectedDate = selected instanceof Date ? selected : undefined;
  const isDisabled = (date: Date) => {
    if (typeof disabled === "function") return disabled(date);
    return false;
  };

  return (
    <div className={className} style={{ padding: "8px" }}>
      <input
        type="date"
        className="border rounded p-2 w-full"
        value={selectedDate ? selectedDate.toISOString().split("T")[0] : ""}
        onChange={handleChange}
        min={new Date().toISOString().split("T")[0]}
      />
    </div>
  );
}
