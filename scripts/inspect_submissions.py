#!/usr/bin/env python3
"""Vis forslagene i basen, med status og hva som faktisk ble anvendt.

submissions er låst til bidragsyteren selv og til admin, så den offentlige
nøkkelen ser ingenting -- det er meningen. Denne bruker service-nøkkelen for
å komme rundt det under feilsøking.

    export SUPABASE_SERVICE_ROLE_KEY='...'      # Supabase -> Settings -> API
    python3 scripts/inspect_submissions.py
    python3 scripts/inspect_submissions.py eurosonic-noorderslag
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

SB = "https://espxguvjupinrxobyabz.supabase.co/rest/v1"


def get(path: str, key: str):
    req = urllib.request.Request(
        SB + path, headers={"apikey": key, "Authorization": f"Bearer {key}"}
    )
    return json.loads(urllib.request.urlopen(req, timeout=25).read())


def short(v, n=70):
    s = json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v
    return s if len(s) <= n else s[: n - 1] + "…"


def main() -> int:
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        print("Mangler SUPABASE_SERVICE_ROLE_KEY. Se docstring øverst i filen.")
        return 1

    slug = sys.argv[1] if len(sys.argv) > 1 else None
    flt = ""
    if slug:
        fest = get(f"/festivals?select=id,name&slug=eq.{urllib.parse.quote(slug)}", key)
        if not fest:
            print(f"Fant ingen festival med slug {slug!r}.")
            return 1
        flt = f"&festival_id=eq.{fest[0]['id']}"
        print(f"Forslag for {fest[0]['name']}\n")

    rows = get(
        "/submissions?select=id,kind,group_id,edition_year,status,payload,"
        "base_snapshot,note,created_at,reviewed_at,review_note,"
        "festivals(slug),profiles!submissions_submitted_by_fkey(display_name)"
        f"&order=created_at.desc&limit=40{flt}",
        key,
    )
    if not rows:
        print("Ingen forslag funnet.")
        return 0

    for r in rows:
        who = (r.get("profiles") or {}).get("display_name") or "?"
        fest = (r.get("festivals") or {}).get("slug") or "?"
        print(f"── {r['created_at'][:19]}  {r['kind']}  [{r['status'].upper()}]")
        print(f"   festival : {fest}   av: {who}")
        if r["group_id"]:
            print(f"   gruppe   : {r['group_id'][:8]}…  (del av et bidrag med flere deler)")
        if r["kind"] == "program_edit":
            p = r["payload"] or {}
            print(
                f"   ops      : +{len(p.get('add', []))} "
                f"−{len(p.get('remove', []))} "
                f"↔{len(p.get('move', []))}   år={r['edition_year']}"
            )
        else:
            for f, v in (r["payload"] or {}).items():
                was = (r.get("base_snapshot") or {}).get(f)
                print(f"   {f:<12}: {short(was, 28)!s:<30} →  {short(v)}")
        if r["note"]:
            print(f"   kommentar: {short(r['note'])}")
        if r["reviewed_at"]:
            print(f"   behandlet: {r['reviewed_at'][:19]}  {r['review_note'] or ''}")
        print()

    pending = [r for r in rows if r["status"] == "pending"]
    print(f"{len(rows)} forslag vist, {len(pending)} venter fortsatt på godkjenning.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read()[:200].decode('utf-8', 'ignore')}")
        sys.exit(1)
