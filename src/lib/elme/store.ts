import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  amount,
  seedActivities,
  seedCategories,
  seedEntries,
  type Activity,
  type Category,
  type Entry,
  type SwatchId,
} from "@/lib/elme/model";
import { mergeImport, parseImport } from "@/lib/elme/import";

export type View = "vandaag" | "inzicht" | "jaar" | "instellingen";

type ElmeState = {
  categories: Category[];
  activities: Activity[];
  entries: Entry[];
  view: View;
  setView: (view: View) => void;
  addCategory: (name: string, color: SwatchId) => void;
  updateCategory: (id: string, name: string, color: SwatchId) => void;
  removeCategory: (id: string) => void;
  addActivity: (categoryId: string, name: string, color: SwatchId) => void;
  updateActivity: (id: string, name: string, color: SwatchId) => void;
  removeActivity: (id: string) => void;
  changeCount: (activityId: string, date: string, delta: number) => void;
  moveEntry: (id: string, date: string) => void;
  removeEntry: (id: string) => void;
  replace: (snapshot: { categories: Category[]; activities: Activity[]; entries: Entry[] }) => void;
  applyImport: (text: string) => { year: number; category: string; activities: number; total: number };
  reset: () => void;
};

function clean(name: string): string {
  return name.trim().slice(0, 40);
}

export const useElme = create<ElmeState>()(
  persist(
    (set) => ({
      categories: seedCategories(),
      activities: seedActivities(),
      entries: seedEntries(),
      view: "vandaag",
      setView: (view) => set({ view }),
      addCategory: (name, color) => {
        const label = clean(name);
        if (!label) return;
        set((state) => ({
          categories: [...state.categories, { id: crypto.randomUUID(), name: label, color }],
        }));
      },
      updateCategory: (id, name, color) => {
        const label = clean(name);
        if (!label) return;
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === id ? { ...category, name: label, color } : category,
          ),
        }));
      },
      removeCategory: (id) =>
        set((state) => {
          const activityIds = new Set(
            state.activities.filter((activity) => activity.categoryId === id).map((activity) => activity.id),
          );
          return {
            categories: state.categories.filter((category) => category.id !== id),
            activities: state.activities.filter((activity) => activity.categoryId !== id),
            entries: state.entries.filter((entry) => !activityIds.has(entry.activityId)),
          };
        }),
      addActivity: (categoryId, name, color) => {
        const label = clean(name);
        if (!label) return;
        set((state) => ({
          activities: [...state.activities, { id: crypto.randomUUID(), categoryId, name: label, color }],
        }));
      },
      updateActivity: (id, name, color) => {
        const label = clean(name);
        if (!label) return;
        set((state) => ({
          activities: state.activities.map((activity) =>
            activity.id === id ? { ...activity, name: label, color } : activity,
          ),
        }));
      },
      removeActivity: (id) =>
        set((state) => ({
          activities: state.activities.filter((activity) => activity.id !== id),
          entries: state.entries.filter((entry) => entry.activityId !== id),
        })),
      changeCount: (activityId, date, delta) =>
        set((state) => {
          const existing = state.entries.find((entry) => entry.activityId === activityId && entry.date === date);
          if (!existing) {
            if (delta < 1) return state;
            return { entries: [{ id: crypto.randomUUID(), activityId, date, count: delta }, ...state.entries] };
          }
          const count = amount(existing) + delta;
          if (count <= 0) return { entries: state.entries.filter((entry) => entry.id !== existing.id) };
          return { entries: state.entries.map((entry) => (entry.id === existing.id ? { ...entry, count } : entry)) };
        }),
      moveEntry: (id, date) =>
        set((state) => {
          const current = state.entries.find((entry) => entry.id === id);
          if (!current || current.date === date) return state;
          const clash = state.entries.find(
            (entry) => entry.id !== id && entry.activityId === current.activityId && entry.date === date,
          );
          if (!clash) return { entries: state.entries.map((entry) => (entry.id === id ? { ...entry, date } : entry)) };
          return {
            entries: state.entries
              .filter((entry) => entry.id !== id)
              .map((entry) => (entry.id === clash.id ? { ...entry, count: amount(entry) + amount(current) } : entry)),
          };
        }),
      removeEntry: (id) => set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),
      replace: (snapshot) =>
        set({
          categories: snapshot.categories,
          activities: snapshot.activities,
          entries: snapshot.entries,
        }),
      applyImport: (text) => {
        const plan = parseImport(text);
        let total = 0;
        set((state) => {
          const next = mergeImport(state, plan);
          total = next.total;
          return { categories: next.categories, activities: next.activities, entries: next.entries };
        });
        return { year: plan.year, category: plan.categoryName, activities: plan.activities.length, total };
      },
      reset: () =>
        set({
          categories: seedCategories(),
          activities: seedActivities(),
          entries: seedEntries(),
          view: "vandaag",
        }),
    }),
    {
      name: "elme-log-v1",
      skipHydration: true,
      partialize: (state) => ({
        categories: state.categories,
        activities: state.activities,
        entries: state.entries,
        view: state.view,
      }),
    },
  ),
);
