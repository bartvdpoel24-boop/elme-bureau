import { SWATCHES, type SwatchId } from "@/lib/elme/model";

const SWATCH_BG: Record<SwatchId, string> = {
  pine: "bg-pine",
  copper: "bg-copper",
  moss: "bg-moss",
  clay: "bg-clay",
  gold: "bg-gold",
  tide: "bg-tide",
  berry: "bg-berry",
  dusk: "bg-dusk",
};

export function swatchBg(id: SwatchId): string {
  return SWATCH_BG[id];
}

export function swatchFill(id: SwatchId): string {
  return `var(--color-${id})`;
}

export function SwatchPicker({
  value,
  onChange,
  label,
}: {
  value: SwatchId;
  onChange: (id: SwatchId) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {SWATCHES.map((swatch) => {
        const selected = value === swatch.id;
        return (
          <button
            key={swatch.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={swatch.label}
            onClick={() => onChange(swatch.id)}
            className={`size-11 rounded-full ${swatchBg(swatch.id)} ${selected ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
          />
        );
      })}
    </div>
  );
}
