export const STATUSES = ["nieuw", "bezig", "review", "klaar"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["hoog", "normaal", "laag"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Person = {
  id: string;
  name: string;
  role: string;
  capacity: number;
};

export type Job = {
  id: string;
  title: string;
  client: string;
  ownerId: string;
  status: Status;
  priority: Priority;
  due: string;
  hours: number;
  note: string;
};

export type JobInput = Omit<Job, "id">;

export const STATUS_LABEL: Record<Status, string> = {
  nieuw: "Nieuw",
  bezig: "Bezig",
  review: "Review",
  klaar: "Klaar",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  hoog: "Hoog",
  normaal: "Normaal",
  laag: "Laag",
};

export const PEOPLE: Person[] = [
  { id: "noor", name: "Noor Veld", role: "Planner", capacity: 32 },
  { id: "samir", name: "Samir El Idrissi", role: "Uitvoerder", capacity: 8 },
  { id: "lotte", name: "Lotte de Graaf", role: "Klantcontact", capacity: 28 },
  { id: "joris", name: "Joris Bakker", role: "Techniek", capacity: 36 },
  { id: "amina", name: "Amina Vos", role: "Kwaliteit", capacity: 24 },
];

export function isoFromToday(offset: number, base = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return isoFromToday(0);
}

export function personById(id: string): Person | undefined {
  return PEOPLE.find((person) => person.id === id);
}

export function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}

export function isOpen(job: Job): boolean {
  return job.status !== "klaar";
}

export function isOverdue(job: Job, today = todayISO()): boolean {
  return isOpen(job) && job.due < today;
}

export function isThisWeek(job: Job, today = todayISO()): boolean {
  return isOpen(job) && job.due <= isoFromToday(6) && (job.due >= today || isOverdue(job, today));
}

export function weekHours(personId: string, jobs: Job[], today = todayISO()): number {
  return jobs
    .filter((job) => job.ownerId === personId && isThisWeek(job, today))
    .reduce((sum, job) => sum + job.hours, 0);
}

export function seedJobs(): Job[] {
  const row = (
    id: string,
    title: string,
    client: string,
    ownerId: string,
    status: Status,
    priority: Priority,
    dueOffset: number,
    hours: number,
    note: string,
  ): Job => ({
    id,
    title,
    client,
    ownerId,
    status,
    priority,
    due: isoFromToday(dueOffset),
    hours,
    note,
  });

  return [
    row(
      "job-westkai",
      "Offerte loods Westkai",
      "Havencombinatie",
      "noor",
      "nieuw",
      "hoog",
      1,
      4,
      "Wacht op de maten van de klant voordat de offerte de deur uit kan.",
    ),
    row(
      "job-kraan",
      "Servicebezoek kraan 4",
      "Terminal Noord",
      "samir",
      "bezig",
      "hoog",
      0,
      6,
      "Smering en visuele controle. Onderdelen liggen klaar in het magazijn.",
    ),
    row(
      "job-intake",
      "Intake nieuwe opdrachtgever",
      "Meridiaan BV",
      "lotte",
      "nieuw",
      "normaal",
      2,
      2,
      "Eerste gesprek over een doorlopend onderhoudscontract.",
    ),
    row(
      "job-materiaal",
      "Materiaalbestelling week 41",
      "Intern",
      "joris",
      "review",
      "normaal",
      3,
      3,
      "Lijst staat klaar. Even nalopen op levertijd van de lagers.",
    ),
    row(
      "job-hal-b",
      "Oplevercontrole hal B",
      "Bakkerij De Molen",
      "amina",
      "bezig",
      "hoog",
      -1,
      5,
      "Controlelijst is half ingevuld. Foto's van de aansluitingen ontbreken nog.",
    ),
    row(
      "job-facturen",
      "Facturen september nalopen",
      "Intern",
      "lotte",
      "review",
      "laag",
      4,
      3,
      "Twee regels wijken af van de urenstaat.",
    ),
    row(
      "job-ploeg",
      "Planning ploegwissel",
      "Intern",
      "noor",
      "bezig",
      "normaal",
      1,
      4,
      "Samir vrijdagmiddag vrij. Dekking zoeken voor Terminal Noord.",
    ),
    row(
      "job-storing",
      "Storing meldsysteem",
      "Terminal Noord",
      "joris",
      "nieuw",
      "hoog",
      0,
      8,
      "Meldingen komen dubbel binnen sinds gisteravond.",
    ),
    row(
      "job-kwartaal",
      "Kwartaalrapport kwaliteit",
      "Intern",
      "amina",
      "nieuw",
      "laag",
      6,
      6,
      "Cijfers van september staan in de map Opleveringen.",
    ),
    row(
      "job-locatie",
      "Locatiebezoek klant",
      "Meridiaan BV",
      "samir",
      "klaar",
      "normaal",
      -2,
      3,
      "Rondleiding gedaan. Vervolg is de intake van Lotte.",
    ),
    row(
      "job-training",
      "Training hijsinstructie",
      "Intern",
      "samir",
      "bezig",
      "normaal",
      5,
      4,
      "Drie mensen ingeschreven. Zaal is gereserveerd.",
    ),
    row(
      "job-hal-a",
      "Nazorg oplevering hal A",
      "Bakkerij De Molen",
      "lotte",
      "klaar",
      "laag",
      -3,
      2,
      "Klant heeft de puntenlijst akkoord gegeven.",
    ),
  ];
}
