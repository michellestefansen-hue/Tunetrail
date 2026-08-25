#!/usr/bin/env python3
"""Opprett robotbrukeren som nattjobben sender forslag i navnet til.

Roboten er en helt vanlig bruker. Den logger aldri inn, men den må finnes i
auth.users fordi profiles.id peker dit -- og den må finnes i profiles fordi
submissions.submitted_by peker dit. Uten den kan ikke nattjobben sende noe.

Kjøres én gang. Kjøres den igjen, finner den brukeren som allerede finnes og
sørger bare for at flagget står riktig.

    export SUPABASE_SERVICE_ROLE_KEY='...'      # Supabase -> Settings -> API
    python3 scripts/create_robot.py

Skriver ut robotens uuid til slutt. Den trenger du ikke ta vare på -- alt i SQL
spør etter profiles.is_robot, ikke etter en id noen må huske.
"""

import json
import os
import sys
import urllib.error
import urllib.request

SB = "https://espxguvjupinrxobyabz.supabase.co"

# Adressen mottar aldri e-post. Den er der fordi auth.users krever en, og fordi
# den er lettere å kjenne igjen i en loggutskrift enn en uuid.
EMAIL = "robot@tune-trail.org"
DISPLAY_NAME = "Tunetrail-roboten"


def call(method: str, path: str, key: str, body: dict | None = None):
    req = urllib.request.Request(
        f"{SB}{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "apikey": key,
            "authorization": f"Bearer {key}",
            "content-type": "application/json",
            "prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(req) as res:
            raw = res.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        return {"__error": e.code, "__body": e.read().decode()}


def main() -> int:
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        print("Mangler SUPABASE_SERVICE_ROLE_KEY i miljøet.")
        print("Hent den i Supabase -> Settings -> API -> service_role, og kjør:")
        print("  export SUPABASE_SERVICE_ROLE_KEY='...'")
        return 2

    # email_confirm, ellers står brukeren som ubekreftet i all framtid og dukker
    # opp som et åpent punkt hver gang du ser på brukerlisten.
    created = call("POST", "/auth/v1/admin/users", key,
                   {"email": EMAIL, "email_confirm": True})

    if created and created.get("__error"):
        # Allerede opprettet er ikke en feil -- det er den vanlige utgangen
        # andre gang noen kjører dette.
        users = call("GET", f"/auth/v1/admin/users?filter={EMAIL}", key)
        match = next((u for u in (users or {}).get("users", []) if u["email"] == EMAIL), None)
        if not match:
            print(f"Klarte ikke å opprette roboten: {created['__error']} {created['__body']}")
            return 1
        uid = match["id"]
        print(f"Roboten fantes fra før: {uid}")
    else:
        uid = created["id"]
        print(f"Opprettet roboten: {uid}")

    # Triggeren on_auth_user_created har allerede laget profilraden. Her settes
    # bare det som skiller en robot fra alle andre.
    updated = call("PATCH", f"/rest/v1/profiles?id=eq.{uid}", key,
                   {"display_name": DISPLAY_NAME, "is_robot": True})
    if isinstance(updated, dict) and updated.get("__error"):
        print(f"Fikk ikke satt profilen: {updated['__error']} {updated['__body']}")
        print("Kjør migrasjonen 20260825_robot_identity.sql først -- is_robot finnes ikke ennå.")
        return 1

    print(f"Profil satt: {DISPLAY_NAME}, is_robot = true")
    print()
    print("Roboten kan nå sende forslag. Den kan ikke fjerne artister, ikke")
    print("flytte dem, og ikke opprette festivaler -- se guard_robot_submission.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
