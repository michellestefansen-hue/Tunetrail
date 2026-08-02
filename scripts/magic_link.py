#!/usr/bin/env python3
"""Lag en innloggingslenke uten å sende e-post.

Supabase sin innebygde e-posttjeneste er strupet til noen få meldinger i timen
per prosjekt -- ikke per adresse -- så under testing går man tom fort. Denne
ber Supabase generere lenken direkte i stedet, og skriver den ut i terminalen.
Ingen e-post sendes, og ingen kvote brukes.

Krever service-nøkkelen, som har full tilgang til databasen. Derfor leses den
fra miljøet og skrives aldri til fil:

    export SUPABASE_SERVICE_ROLE_KEY='...'      # Supabase -> Settings -> API
    python3 scripts/magic_link.py din@epost.no

Legg til --prod for å få lenken mot produksjon i stedet for localhost.
"""

import json
import os
import sys
import urllib.error
import urllib.request

SB = "https://espxguvjupinrxobyabz.supabase.co"
LOCAL = "http://localhost:3001"
PROD = "https://tune-trail.org"


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__)
        return 2

    email = args[0]
    origin = PROD if "--prod" in sys.argv else LOCAL
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        print("Mangler SUPABASE_SERVICE_ROLE_KEY i miljøet.")
        print("Hent den i Supabase -> Settings -> API -> service_role, og kjør:")
        print("  export SUPABASE_SERVICE_ROLE_KEY='...'")
        return 1

    payload = {
        "type": "magiclink",
        "email": email,
        "options": {"redirect_to": f"{origin}/auth/callback?neste=%2Fadmin"},
    }
    req = urllib.request.Request(
        f"{SB}/auth/v1/admin/generate_link",
        data=json.dumps(payload).encode(),
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        body = json.loads(urllib.request.urlopen(req, timeout=25).read())
    except urllib.error.HTTPError as e:
        detail = e.read()[:300].decode("utf-8", "ignore")
        print(f"Feil fra Supabase (HTTP {e.code}): {detail}")
        return 1

    link = body.get("action_link")
    if not link:
        print("Uventet svar:", json.dumps(body)[:300])
        return 1

    print(f"\nLenke for {email} ({origin}):\n")
    print(link)
    print("\nLim den inn i nettleseren. Den kan bare brukes én gang.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
