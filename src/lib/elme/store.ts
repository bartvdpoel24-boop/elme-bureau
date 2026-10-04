import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedJobs, type Job, type JobInput } from "@/lib/elme/model";

export type View = "overzicht" | "bord" | "team";

type ElmeState = {
  jobs: Job[];
  view: View;
  query: string;
  ownerFilter: string;
  setView: (view: View) => void;
  setQuery: (query: string) => void;
  setOwnerFilter: (ownerFilter: string) => void;
  addJob: (input: JobInput) => void;
  updateJob: (id: string, input: JobInput) => void;
  moveJob: (id: string, direction: -1 | 1) => void;
  removeJob: (id: string) => void;
  reset: () => void;
};

const ORDER = ["nieuw", "bezig", "review", "klaar"] as const;

export const useElme = create<ElmeState>()(
  persist(
    (set) => ({
      jobs: seedJobs(),
      view: "overzicht",
      query: "",
      ownerFilter: "alle",
      setView: (view) => set({ view }),
      setQuery: (query) => set({ query }),
      setOwnerFilter: (ownerFilter) => set({ ownerFilter }),
      addJob: (input) =>
        set((state) => ({
          jobs: [{ ...input, id: crypto.randomUUID() }, ...state.jobs],
        })),
      updateJob: (id, input) =>
        set((state) => ({
          jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...input, id } : job)),
        })),
      moveJob: (id, direction) =>
        set((state) => ({
          jobs: state.jobs.map((job) => {
            if (job.id !== id) return job;
            const index = ORDER.indexOf(job.status);
            const next = ORDER[index + direction];
            return next ? { ...job, status: next } : job;
          }),
        })),
      removeJob: (id) => set((state) => ({ jobs: state.jobs.filter((job) => job.id !== id) })),
      reset: () => set({ jobs: seedJobs(), view: "overzicht", query: "", ownerFilter: "alle" }),
    }),
    {
      name: "elme-bureau-v1",
      skipHydration: true,
      partialize: (state) => ({
        jobs: state.jobs,
        view: state.view,
        ownerFilter: state.ownerFilter,
      }),
    },
  ),
);
