import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NumberPad({
  max = 9,
  includeZero = true,
  onDigit,
  onDelete,
  ops,
  onOp,
}: {
  max?: number;
  includeZero?: boolean;
  onDigit: (d: number) => void;
  onDelete: () => void;
  ops?: string[];
  onOp?: (ch: string) => void;
}) {
  const digits = Array.from({ length: max }, (_, i) => i + 1);
  const cols = max <= 4 ? max : 3;
  return (
    <div className="mx-auto w-full max-w-md pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {ops && onOp && (
        <div className="mb-2 grid grid-cols-5 gap-1.5">
          {ops.map((op) => (
            <Button key={op} variant="pad" size="pad" className="w-full" onClick={() => onOp(op)}>
              {op}
            </Button>
          ))}
        </div>
      )}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {digits.map((d) => (
          <Button key={d} variant="pad" size="pad" className="w-full" onClick={() => onDigit(d)}>
            {d}
          </Button>
        ))}
        {includeZero && (
          <Button variant="pad" size="pad" className="w-full" onClick={() => onDigit(0)}>
            0
          </Button>
        )}
        <Button variant="pad" size="pad" className="w-full" aria-label="Delete" onClick={onDelete}>
          <Delete className="size-5" />
        </Button>
      </div>
    </div>
  );
}
