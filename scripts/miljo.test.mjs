/**
 * Nattkjøringen kan starte i en git-arbeidskopi uten .env.local. Disse testene
 * bygger akkurat det i en midlertidig mappe og ser at nøklene blir funnet uten
 * at noen må gå ut av mappen.
 *
 *   node --test scripts/miljo.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { finnEnvFil } from "./miljo.mjs";

const MILJO = fileURLToPath(new URL("./miljo.mjs", import.meta.url));
const git = (cwd, ...a) => execFileSync("git", a, { cwd, stdio: "ignore" });

function prosjektMedKopi() {
  const rot = realpathSync(mkdtempSync(join(tmpdir(), "miljo-")));
  const hoved = join(rot, "tunetrail");
  execFileSync("mkdir", ["-p", hoved]);
  git(hoved, "init", "-q");
  git(hoved, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "x");
  writeFileSync(join(hoved, ".env.local"), "NEXT_PUBLIC_SUPABASE_URL=https://fra-hovedmappen.example\n");
  const kopi = join(rot, "kopi");
  git(hoved, "worktree", "add", "-q", kopi);
  return { rot, hoved, kopi };
}

// Kjører miljo.mjs i en egen prosess fra `cwd`, og svarer med hva URL-en ble.
function urlFra(cwd, env = {}) {
  const ut = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(MILJO)}); console.log(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")`],
    { cwd, encoding: "utf8", env: { PATH: process.env.PATH, ...env } },
  );
  return ut.trim();
}

test("i hovedmappen finnes .env.local der vi står", () => {
  const { rot, hoved } = prosjektMedKopi();
  try {
    assert.equal(finnEnvFil(hoved), join(hoved, ".env.local"));
    assert.equal(urlFra(hoved), "https://fra-hovedmappen.example");
  } finally {
    rmSync(rot, { recursive: true, force: true });
  }
});

test("fra en arbeidskopi uten .env.local finnes hovedmappens", () => {
  // Dette er nattkjøringen: den starter i kopien, og skal ikke måtte gå ut.
  const { rot, hoved, kopi } = prosjektMedKopi();
  try {
    assert.equal(finnEnvFil(kopi), join(hoved, ".env.local"));
    assert.equal(urlFra(kopi), "https://fra-hovedmappen.example");
  } finally {
    rmSync(rot, { recursive: true, force: true });
  }
});

test("det som allerede er satt, overskrives aldri", () => {
  // En skyøkt har nøklene i miljøet. Da skal ingen fil på disken vinne.
  const { rot, kopi } = prosjektMedKopi();
  try {
    assert.equal(urlFra(kopi, { NEXT_PUBLIC_SUPABASE_URL: "https://fra-miljoet.example" }), "https://fra-miljoet.example");
  } finally {
    rmSync(rot, { recursive: true, force: true });
  }
});

test("utenfor et prosjekt finnes ingenting, og ingenting går galt", () => {
  const rot = realpathSync(mkdtempSync(join(tmpdir(), "miljo-tom-")));
  try {
    assert.equal(finnEnvFil(rot), null);
    assert.equal(urlFra(rot), "");
  } finally {
    rmSync(rot, { recursive: true, force: true });
  }
});
