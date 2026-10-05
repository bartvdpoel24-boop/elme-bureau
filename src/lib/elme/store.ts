import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  amount,
  seedActivities,
  seedCategories,
  seedEntries,
  seedLabels,
  type Activity,
  type Category,
  type Entry,
  type Label,
  type SwatchId,
  type TargetPeriod,
} from "@/lib/elme/model";
import { mergeImport, parseImport } from "@/lib/elme/import";

export type View = "vandaag" | "inzicht" | "jaar" | "instellingen";

type Log = { categories: Category[]; activities: Activity[]; entries: Entry[]; labels: Label[] };

type ElmeState = {
  categories: Category[];
  activities: Activity[];
  entries: Entry[];
  labels: Label[];
  view: View;
  setView: (view: View) => void;
  addCategory: (name: string, color: SwatchId) => void;
  updateCategory: (id: string, name: string, color: SwatchId) => void;
  removeCategory: (id: string) => void;
  addLabel: (categoryId: string, name: string) => void;
  removeLabel: (id: string) => void;
  addActivity: (categoryId: string, name: string, color: SwatchId) => void;
  updateActivity: (id: string, name: string, color: SwatchId) => void;
  setTarget: (id: string, count: number | null, period: TargetPeriod) => void;
  setReminder: (id: string, count: number | null, period: TargetPeriod) => void;
  removeActivity: (id: string) => void;
  changeCount: (activityId: string, date: string, delta: number) => void;
  toggleLabel: (activityId: string, date: string, labelId: string) => void;
  moveEntry: (id: string, date: string) => void;
  removeEntry: (id: string) => void;
  replace: (snapshot: Log) => void;
  applyImport: (text: string) => { year: number; category: string; activities: number; total: number };
  loadDemo: () => void;
  clear: () => void;
};

function clean(name: string): string {
  return name.trim().slice(0, 40);
}

export const useElme = create<ElmeState>()(
  persist(
    (set) => ({
      categories: [],
      activities: [],
      entries: [],
      labels: [],
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
            labels: state.labels.filter((label) => label.categoryId !== id),
            activities: state.activities.filter((activity) => activity.categoryId !== id),
            entries: state.entries.filter((entry) => !activityIds.has(entry.activityId)),
          };
        }),
      addLabel: (categoryId, name) => {
        const label = clean(name);
        if (!label) return;
        set((state) => {
          const taken = state.labels.some(
            (item) => item.categoryId === categoryId && item.name.toLowerCase() === label.toLowerCase(),
          );
          if (taken) return state;
          return { labels: [...state.labels, { id: crypto.randomUUID(), categoryId, name: label }] };
        });
      },
      removeLabel: (id) =>
        set((state) => ({
          labels: state.labels.filter((label) => label.id !== id),
          entries: state.entries.map((entry) =>
            entry.labelIds?.includes(id) ? { ...entry, labelIds: entry.labelIds.filter((item) => item !== id) } : entry,
          ),
        })),
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
      setTarget: (id, count, period) =>
        set((state) => ({
          activities: state.activities.map((activity) => {
            if (activity.id !== id) return activity;
            if (!count || count < 1) {
              const next = { ...activity };
              delete next.targetCount;
              delete next.targetPeriod;
              return next;
            }
            return { ...activity, targetCount: Math.min(999, Math.round(count)), targetPeriod: period };
          }),
        })),
      setReminder: (id, count, period) =>
        set((state) => ({
          activities: state.activities.map((activity) => {
            if (activity.id !== id) return activity;
            if (!count || count < 1) {
              const next = { ...activity };
              delete next.remindAfter;
              delete next.remindPeriod;
              return next;
            }
            return { ...activity, remindAfter: Math.min(999, Math.round(count)), remindPeriod: period };
          }),
        })),
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
      toggleLabel: (activityId, date, labelId) =>
        set((state) => {
          const existing = state.entries.find((entry) => entry.activityId === activityId && entry.date === date);
          if (!existing) {
            return { entries: [{ id: crypto.randomUUID(), activityId, date, count: 1, labelIds: [labelId] }, ...state.entries] };
          }
          const current = existing.labelIds ?? [];
          const labelIds = current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId];
          return { entries: state.entries.map((entry) => (entry.id === existing.id ? { ...entry, labelIds } : entry)) };
        }),
      moveEntry: (id, date) =>
        set((state) => {
          const current = state.entries.find((entry) => entry.id === id);
          if (!current || current.date === date) return state;
          const clash = state.entries.find(
            (entry) => entry.id !== id && entry.activityId === current.activityId && entry.date === date,
          );
          if (!clash) return { entries: state.entries.map((entry) => (entry.id === id ? { ...entry, date } : entry)) };
          const labelIds = [...new Set([...(clash.labelIds ?? []), ...(current.labelIds ?? [])])];
          return {
            entries: state.entries
              .filter((entry) => entry.id !== id)
              .map((entry) => (entry.id === clash.id ? { ...entry, count: amount(entry) + amount(current), labelIds } : entry)),
          };
        }),
      removeEntry: (id) => set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),
      replace: (snapshot) =>
        set({
          categories: snapshot.categories,
          activities: snapshot.activities,
          entries: snapshot.entries,
          labels: snapshot.labels,
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
      loadDemo: () =>
        set({
          categories: seedCategories(),
          activities: seedActivities(),
          entries: seedEntries(),
          labels: seedLabels(),
          view: "vandaag",
        }),
      clear: () => set({ categories: [], activities: [], entries: [], labels: [], view: "vandaag" }),
    }),
    {
      name: "telme-log-v1",
      skipHydration: true,
      partialize: (state) => ({
        categories: state.categories,
        activities: state.activities,
        entries: state.entries,
        labels: state.labels,
        view: state.view,
      }),
    },
  ),
);
