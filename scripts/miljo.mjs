/**
 * Finner .env.local selv, også når en økt kjører i en egen arbeidskopi.
 *
 * Claude-appen kan starte hver nattkjøring i en ny git-arbeidskopi (worktree)
 * i stedet for i tunetrail-mappen. .env.local er git-ignorert med vilje, så den
 * finnes ikke i kopien. Da fant ikke skriptene nøklene, og roboten «hjalp seg
 * selv» ved å gå til hovedmappen med `cd` og full sti -- utenfor mappen økten
 * har lov til å skrive i. Hver eneste av de kommandoene stoppet på en
 * godkjenningsdialog midt på natten.
 *
 * Importeres øverst i skriptene. Leser fila bare hvis nøklene ikke alt er satt
 * (av --env-file, eller av miljøet i en skyøkt), og overskriver aldri noe som
 * er satt. Skriver aldri ut noe av innholdet.
 */
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

/** .env.local i mappen vi står i, eller i hovedmappen til arbeidskopien. */
export function finnEnvFil(cwd = process.cwd()) {
  const her = join(cwd, ".env.local");
  if (existsSync(her)) return her;
  try {
    // For en arbeidskopi peker --git-common-dir på hovedmappens .git.
    const felles = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const hoved = join(dirname(felles), ".env.local");
    if (existsSync(hoved)) return hoved;
  } catch {
    // Ikke et git-repo, eller git mangler. Da finnes det ingenting å lete etter.
  }
  return null;
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const fil = finnEnvFil();
  if (fil) process.loadEnvFile(fil);
}
