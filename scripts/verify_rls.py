#!/usr/bin/env python3
"""Bekrefter at publikum kan lese, men ikke skrive.

Kjør før og etter supabase/migrations/20260802_rls_lockdown.sql.
Bruker kun den offentlige nøkkelen -- altså det en hvilken som helst besøkende
kan gjøre fra nettleserkonsollen.

Skrivetestene treffer med vilje rader som ikke finnes, så ingenting endres
uansett utfall. Det som testes er om serveren i det hele tatt tillater
operasjonen.

    python3 scripts/verify_rls.py
"""

import json
import sys
import urllib.error
import urllib.request

SB = "https://espxguvjupinrxobyabz.supabase.co/rest/v1"
ANON = "sb_publishable_2RC59nLrzNoKDVvgu_oo2g_Ut7c6V-Z"
H = {
    "apikey": ANON,
    "Authorization": f"Bearer {ANON}",
    "Content-Type": "application/json",
}

GREEN, RED, DIM, OFF = "\033[32m", "\033[31m", "\033[2m", "\033[0m"


def call(method, path, payload=None):
    req = urllib.request.Request(
        SB + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers=H,
        method=method,
    )
    try:
        r = urllib.request.urlopen(req, timeout=20)
        return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def main():
    checks = []

    # Lesing må fortsatt virke, ellers er appen nede.
    for table, col in (("festivals", "slug"), ("festival_editions", "year")):
        code, body = call("GET", f"/{table}?select={col}&limit=1")
        ok = code == 200 and len(json.loads(body)) == 1
        checks.append((ok, f"les {table}", f"HTTP {code}", "må virke"))

    # Skriving må være nektet. Filteret treffer ingen rad.
    writes = [
        ("PATCH", "/festivals?slug=eq.__finnes_ikke__", {"city": "__probe__"}),
        ("PATCH", "/festival_editions?year=eq.1900", {"source": "__probe__"}),
        ("DELETE", "/festivals?slug=eq.__finnes_ikke__", None),
        ("POST", "/festivals", {"slug": "__probe__", "name": "__probe__"}),
    ]
    for method, path, payload in writes:
        code, body = call(method, path, payload)
        # 401/403 = nektet. 200/201/204 = tillatt, altså fortsatt åpent.
        ok = code in (401, 403)
        label = f"{method} {path.split('?')[0].lstrip('/')}"
        note = "nektet" if ok else "TILLATT - hullet står åpent"
        checks.append((ok, label, f"HTTP {code}", note))

    print()
    for ok, label, code, note in checks:
        mark = f"{GREEN}ok  {OFF}" if ok else f"{RED}FEIL{OFF}"
        print(f"  {mark} {label:44} {code:9} {DIM}{note}{OFF}")

    failed = [c for c in checks if not c[0]]
    print()
    if failed:
        print(f"{RED}{len(failed)} av {len(checks)} sjekker feilet.{OFF}")
        print("Har du kjørt supabase/migrations/20260802_rls_lockdown.sql?")
        return 1
    print(f"{GREEN}Alle {len(checks)} sjekker ok: publikum leser, publikum skriver ikke.{OFF}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
