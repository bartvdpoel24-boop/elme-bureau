import { createServerFn } from "@tanstack/react-start";
import { parseLog, type LogSnapshot } from "@/lib/elme/api";

const FILE_NAME = "TelMe-backup.json";
const DRIVE = "GoogleDrive";

type DriveResult = {
  ok: boolean;
  message: string;
  loginUrl?: string;
  data?: LogSnapshot;
};

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  for (const key of ["textContent", "text", "content", "body", "data"]) {
    if (typeof row[key] === "string") return row[key];
  }
  return "";
}

function filesOf(value: unknown): { id: string; name: string }[] {
  const bag = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? ((value as Record<string, unknown>).files ?? (value as Record<string, unknown>).items ?? [])
      : [];
  if (!Array.isArray(bag)) return [];
  return bag.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? row.file_id ?? row.fileId ?? "");
    const name = String(row.name ?? row.title ?? "");
    if (!id) return [];
    return [{ id, name }];
  });
}

async function drive(tool: string, args: Record<string, unknown>) {
  const { callTool } = await import("@/lib/app-data/client.server");
  return callTool(tool, args, { connectorType: DRIVE });
}

function fail(result: { errorMessage?: string; loginRequired?: boolean; loginUrl?: string; pending?: boolean }): DriveResult {
  if (result.loginRequired) {
    return {
      ok: false,
      message: "Koppel Google Drive om de backup te gebruiken.",
      ...(result.loginUrl ? { loginUrl: result.loginUrl } : {}),
    };
  }
  if (result.pending) return { ok: false, message: "Google Drive is nog niet klaar. Probeer het zo nog eens." };
  const detail = result.errorMessage ?? "";
  if (/missing_connector_token|access_denied/i.test(detail)) {
    return { ok: false, message: "Koppel Google Drive in Grok, en open TelMe daarna opnieuw." };
  }
  return { ok: false, message: "Google Drive reageerde niet. Probeer het nog eens." };
}

async function findBackup() {
  const found = await drive("google_drive_search", { q: FILE_NAME });
  if (!found.ok) return { error: fail(found), file: null as { id: string; name: string } | null };
  const file = filesOf(found.data).find((item) => item.name === FILE_NAME) ?? null;
  return { error: null, file };
}

async function writeBackup(json: string, fileId: string | null): Promise<DriveResult & { missingTool?: boolean }> {
  const attempts: [string, Record<string, unknown>][] = fileId
    ? [
        ["google_drive_update_file", { file_id: fileId, name: FILE_NAME, mime_type: "application/json", content: json, textContent: json }],
        ["google_drive_upload_file", { file_id: fileId, name: FILE_NAME, mime_type: "application/json", content: json, textContent: json }],
      ]
    : [
        ["google_drive_upload_file", { name: FILE_NAME, mime_type: "application/json", contentMimeType: "application/json", content: json, textContent: json }],
        ["google_drive_create_file", { name: FILE_NAME, title: FILE_NAME, mimeType: "application/json", contentMimeType: "application/json", content: json, textContent: json }],
      ];
  let last = fail({});
  let missingTool = true;
  for (const [tool, args] of attempts) {
    const result = await drive(tool, args);
    if (result.ok) return { ok: true, message: fileId ? "Backup bijgewerkt in Google Drive." : "Backup staat in Google Drive." };
    if (result.loginRequired || result.pending) return fail(result);
    last = fail(result);
    if (!/unknown|not found|unsupported|no such/i.test(result.errorMessage ?? "")) missingTool = false;
  }
  return { ...last, missingTool };
}

export const backupLog = createServerFn({ method: "POST" })
  .validator((value: unknown) => parseLog(value))
  .handler(async ({ data }): Promise<DriveResult> => {
    const json = JSON.stringify(data);
    const existing = await findBackup();
    if (existing.error?.loginUrl || existing.error?.message.startsWith("Koppel") || existing.error?.message.startsWith("Google Drive is nog")) {
      return existing.error;
    }
    const written = await writeBackup(json, existing.file?.id ?? null);
    if (written.ok || !existing.file || !written.missingTool) return written;
    await drive("google_drive_trash_file", { file_id: existing.file.id });
    return writeBackup(json, null);
  });

export const restoreLog = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async (): Promise<DriveResult> => {
    const existing = await findBackup();
    if (existing.error) return existing.error;
    if (!existing.file) return { ok: false, message: "Geen TelMe-backup gevonden in Google Drive." };
    const read = await drive("google_drive_read_file", { file_id: existing.file.id });
    if (!read.ok) return fail(read);
    try {
      const data = parseLog(JSON.parse(textOf(read.data)));
      return { ok: true, message: "Backup teruggezet.", data };
    } catch {
      return { ok: false, message: "Het bestand in Drive is geen TelMe-backup." };
    }
  });
