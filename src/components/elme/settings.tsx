import { useState } from "react";
import type { SwatchId, TargetPeriod } from "@/lib/elme/model";
import { useElme } from "@/lib/elme/store";
import { SwatchPicker, swatchBg } from "@/components/elme/swatches";

export function Settings() {
  const categories = useElme((state) => state.categories);
  const activities = useElme((state) => state.activities);
  const addCategory = useElme((state) => state.addCategory);
  const updateCategory = useElme((state) => state.updateCategory);
  const removeCategory = useElme((state) => state.removeCategory);
  const addActivity = useElme((state) => state.addActivity);
  const updateActivity = useElme((state) => state.updateActivity);
  const setTarget = useElme((state) => state.setTarget);
  const removeActivity = useElme((state) => state.removeActivity);

  const [name, setName] = useState("");
  const [color, setColor] = useState<SwatchId>("moss");
  const [importText, setImportText] = useState("");
  const [importNote, setImportNote] = useState("");
  const [importError, setImportError] = useState("");
  const applyImport = useElme((state) => state.applyImport);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-3xl">Instellingen</h2>
        <p className="text-muted">Een categorie groepeert activiteiten. Per activiteit kun je een doel zetten: dat wordt een lijn in de grafiek.</p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-lg border border-line bg-paper p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setImportError("");
          setImportNote("");
          try {
            const result = applyImport(importText);
            setImportNote(
              `${result.year} · ${result.category} · ${result.activities} activiteiten · ${result.total} keer verdeeld over het jaar.`,
            );
            setImportText("");
          } catch (error) {
            setImportError(error instanceof Error ? error.message : "Importeren lukte niet.");
          }
        }}
      >
        <h3 className="font-display text-2xl">Importeren</h3>
        <p className="text-sm text-muted">
          Eerste regel het jaar, tweede de categorie, daarna per activiteit twaalf maandtotalen. Die worden
          gelijkmatig op willekeurige dagen in de maand gezet. Een import vervangt dat jaar voor dezelfde activiteiten.
        </p>
        <label className="block">
          <span className="sr-only">Importtekst</span>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={8}
            placeholder={"2025\nX\nN: 18,15,18,18,15,16,21,17,17,16,13,18\nMA: 6,9,5,7,7,10,3,10,12,7,7,8"}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-sm"
          />
        </label>
        {importError ? <p className="text-sm font-semibold text-copper">{importError}</p> : null}
        {importNote ? <p className="text-sm font-semibold text-pine">{importNote}</p> : null}
        <button
          type="submit"
          disabled={!importText.trim()}
          className="h-11 rounded-lg bg-pine px-4 font-semibold text-paper disabled:opacity-40"
        >
          Importeren
        </button>
      </form>

      <form
        className="flex flex-col gap-3 rounded-lg border border-line bg-paper p-4"
        onSubmit={(event) => {
          event.preventDefault();
          addCategory(name, color);
          setName("");
        }}
      >
        <h3 className="font-display text-2xl">Nieuwe categorie</h3>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Naam</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            placeholder="Bijvoorbeeld Sporten"
            className="h-11 w-full rounded-lg border border-line bg-canvas px-3"
          />
        </label>
        <div>
          <p className="mb-2 text-sm font-semibold">Kleur</p>
          <SwatchPicker value={color} onChange={setColor} label="Kleur van de categorie" />
        </div>
        <button
          type="submit"
          disabled={!name.trim()}
          className="h-11 rounded-lg bg-pine px-4 font-semibold text-paper disabled:opacity-40"
        >
          Categorie toevoegen
        </button>
      </form>

      {categories.length === 0 ? <p className="text-muted">Nog geen categorieën.</p> : null}

      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          id={category.id}
          name={category.name}
          color={category.color}
          activities={activities.filter((activity) => activity.categoryId === category.id)}
          onSave={(nextName, nextColor) => updateCategory(category.id, nextName, nextColor)}
          onRemove={() => removeCategory(category.id)}
          onAddActivity={(activityName, activityColor) => addActivity(category.id, activityName, activityColor)}
          onSaveActivity={(id, activityName, activityColor) => updateActivity(id, activityName, activityColor)}
          onTarget={setTarget}
          onRemoveActivity={removeActivity}
        />
      ))}
    </div>
  );
}

function CategoryCard({
  id,
  name,
  color,
  activities,
  onSave,
  onRemove,
  onAddActivity,
  onSaveActivity,
  onTarget,
  onRemoveActivity,
}: {
  id: string;
  name: string;
  color: SwatchId;
  activities: { id: string; name: string; color: SwatchId; targetCount?: number; targetPeriod?: TargetPeriod }[];
  onSave: (name: string, color: SwatchId) => void;
  onRemove: () => void;
  onAddActivity: (name: string, color: SwatchId) => void;
  onSaveActivity: (id: string, name: string, color: SwatchId) => void;
  onTarget: (id: string, count: number | null, period: TargetPeriod) => void;
  onRemoveActivity: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftColor, setDraftColor] = useState(color);
  const [confirm, setConfirm] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [activityColor, setActivityColor] = useState<SwatchId>(color === "copper" ? "tide" : "copper");

  return (
    <section className="rounded-lg border border-line bg-paper p-4">
      {editing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(draftName, draftColor);
            setEditing(false);
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Naam</span>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              maxLength={40}
              className="h-11 w-full rounded-lg border border-line bg-canvas px-3"
            />
          </label>
          <SwatchPicker value={draftColor} onChange={setDraftColor} label={`Kleur van ${name}`} />
          <div className="flex gap-2">
            <button type="submit" className="h-11 rounded-lg bg-pine px-4 font-semibold text-paper">
              Bewaar
            </button>
            <button type="button" className="h-11 px-3 font-semibold" onClick={() => setEditing(false)}>
              Annuleer
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 font-display text-2xl">
            <span className={`size-3 rounded-full ${swatchBg(color)}`} />
            {name}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-11 rounded-lg border border-line px-3 font-semibold"
              onClick={() => {
                setDraftName(name);
                setDraftColor(color);
                setEditing(true);
                setConfirm(false);
              }}
            >
              Wijzig
            </button>
            <button
              type="button"
              className="h-11 rounded-lg px-3 font-semibold text-copper"
              onClick={() => {
                if (!confirm) {
                  setConfirm(true);
                  return;
                }
                onRemove();
              }}
            >
              {confirm ? "Zeker wissen" : "Wis categorie"}
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {activities.map((activity) => (
          <ActivityRow
            key={activity.id}
            id={`${id}-${activity.id}`}
            name={activity.name}
            color={activity.color}
            targetCount={activity.targetCount}
            targetPeriod={activity.targetPeriod ?? "week"}
            onSave={(nextName, nextColor) => onSaveActivity(activity.id, nextName, nextColor)}
            onTarget={(count, period) => onTarget(activity.id, count, period)}
            onRemove={() => onRemoveActivity(activity.id)}
          />
        ))}
      </ul>

      <form
        className="mt-4 flex flex-col gap-3 border-t border-line pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          onAddActivity(activityName, activityColor);
          setActivityName("");
        }}
      >
        <h4 className="font-semibold">Nieuwe activiteit in {name}</h4>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Naam</span>
          <input
            value={activityName}
            onChange={(event) => setActivityName(event.target.value)}
            maxLength={40}
            placeholder="Bijvoorbeeld Tennis"
            className="h-11 w-full rounded-lg border border-line bg-canvas px-3"
          />
        </label>
        <SwatchPicker value={activityColor} onChange={setActivityColor} label={`Kleur van activiteit in ${name}`} />
        <button
          type="submit"
          disabled={!activityName.trim()}
          className="h-11 rounded-lg bg-pine px-4 font-semibold text-paper disabled:opacity-40"
        >
          Activiteit toevoegen
        </button>
      </form>
    </section>
  );
}

function ActivityRow({
  id,
  name,
  color,
  targetCount,
  targetPeriod,
  onSave,
  onTarget,
  onRemove,
}: {
  id: string;
  name: string;
  color: SwatchId;
  targetCount?: number;
  targetPeriod: TargetPeriod;
  onSave: (name: string, color: SwatchId) => void;
  onTarget: (count: number | null, period: TargetPeriod) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftColor, setDraftColor] = useState(color);
  const [confirm, setConfirm] = useState(false);

  if (editing) {
    return (
      <li className="rounded-lg border border-line bg-canvas p-3">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(draftName, draftColor);
            setEditing(false);
          }}
        >
          <label className="block">
            <span className="sr-only">Naam van {name}</span>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              maxLength={40}
              className="h-11 w-full rounded-lg border border-line bg-paper px-3"
            />
          </label>
          <SwatchPicker value={draftColor} onChange={setDraftColor} label={`Kleur van ${name}`} />
          <div className="flex gap-2">
            <button type="submit" className="h-11 rounded-lg bg-pine px-4 font-semibold text-paper">
              Bewaar
            </button>
            <button type="button" className="h-11 px-3 font-semibold" onClick={() => setEditing(false)}>
              Annuleer
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li id={id} className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center">
      <p className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
        <span className={`size-3 shrink-0 rounded-full ${swatchBg(color)}`} />
        <span className="truncate">{name}</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="h-11 rounded-lg border border-line px-3 font-semibold"
          onClick={() => {
            setDraftName(name);
            setDraftColor(color);
            setEditing(true);
            setConfirm(false);
          }}
        >
          Wijzig
        </button>
        <button type="button" className="h-11 px-3 font-semibold text-copper" onClick={() => (confirm ? onRemove() : setConfirm(true))}>
          {confirm ? "Zeker wissen" : "Wis"}
        </button>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <label className="text-sm font-semibold text-muted">
          Doel
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={targetCount ?? ""}
            placeholder="—"
            aria-label={`Doel voor ${name}`}
            onChange={(event) => {
              const raw = event.target.value;
              onTarget(raw === "" ? null : Number(raw), targetPeriod);
            }}
            className="ml-2 h-11 w-20 rounded-lg border border-line bg-canvas px-2 font-semibold text-ink"
          />
        </label>
        <label className="text-sm font-semibold text-muted">
          <span className="sr-only">Periode van het doel voor {name}</span>
          <select
            value={targetPeriod}
            onChange={(event) => onTarget(targetCount ?? null, event.target.value as TargetPeriod)}
            className="h-11 rounded-lg border border-line bg-canvas px-2 font-semibold text-ink"
          >
            <option value="day">per dag</option>
            <option value="week">per week</option>
            <option value="month">per maand</option>
          </select>
        </label>
      </div>
    </li>
  );
}
