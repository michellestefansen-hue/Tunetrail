# Tunetrail — Behance case, tredje utkast

Engelsk, første person, korte avsnitt mellom bildemoduler. Rundt 850 ord.

**Tagger:** ux · UI/UX · user experience · product design · visual design ·
Next.js · Supabase · MapLibre · Claude Code

> **Sjekk timetallet før publisering.** Jeg har satt ~80 timer ut fra 128
> commits over fem uker. Du vet hva som faktisk gikk med — særlig
> dataarbeidet, som ikke etterlater commits. Rett tallet til det du kjenner
> igjen, og behold sammenligningen med to arbeidsuker. Den gjør innsatsen
> lesbar for noen som tenker i prosjektuker.

---

**Role:** Design, product, build · **Timeline:** 5 weeks of evenings, ~80 hours
· **Team:** me

---

## The festivals I only heard about after they had happened

All summer I saw photos from festivals I would have loved to go to, and had
never heard of. So I went looking for a decent overview of European festivals.

It doesn't exist. The big names are easy to find. The small ones live inside
Facebook events, often in a language I don't read, and you only find them when
someone you know posts a photo. That is a discovery problem in both directions:
I couldn't find them, and they couldn't be found.

So I built the thing I had gone looking for. **Tunetrail is a map of 694
festivals across 32 countries, in five languages** — about two working weeks of
evenings, spread over five.

I built it before doing any research, and I would do it again.

Building used to be the expensive part, so you spent insight up front to avoid
paying for the wrong thing later. That trade has changed. I could put a working
version in front of people within days and let them tell me what was wrong —
which they did, repeatedly, and I changed it. Iteration turned out to be
cheaper than certainty.

That holds while the cost of being wrong is low. On a client's product, with
real users and real money, the sequence goes back the other way and I would
argue for it. But on this, the fastest way to find out what people wanted was
to hand them something and watch.

**This is the part I have taken back into my day job.** Not the tooling — the
sequence. When a prototype costs an evening instead of a sprint, "let's find
out" beats "let's align", and a lot of meetings turn out to have been standing
in for something nobody had built yet.

---

## A sunset over a festival night

Every default map style looks like a route planner. I wanted the map to feel
like the thing it describes, so I took the palette from the last hour of a
festival day: orange still on the horizon, sky already gone purple, everything
lit from below.

Bloom, glow, multi-octave fractal noise. If you know, you know. Four stacked
line layers where a real renderer would give you one bloom pass, and a noise
texture generated in the browser so nothing large ever goes flat.

The data would be useful either way. The reason people stop and look is the
light.

---

## Two problems, one map

**For festival-goers:** find the small ones. Search 12,500 artists across every
line-up, filter by size so a 300-person local festival isn't buried under
Roskilde, and read it in your own language.

**For organisers:** be findable. A festival with nothing but a Facebook event
in Portuguese now has a page, a map pin, and five translations it didn't pay
for.

Then I put it in front of people and kept changing it. Colleagues, my network,
anyone who would look. Most of what shipped after the first version came from
someone telling me what was missing.

> **"Thank you! I've been missing this."**
> — Inger Lomeland, Managing Director, Egersundregionen

> **"Really valuable, and simple."**
> — Ramo Tiro, UX / Design System Lead, Statnett

Inger works in regional development — the organiser side, which I had no line
into at all. She asked for a way to tell festival sizes apart, and that filter
shipped the same week. That is the potential of the thing: it can grow faster
than one person can curate, because it isn't only me curating it.

---

## What it is made of

Next.js on Vercel, Postgres via Supabase, MapLibre with a hand-built style,
five locales with translated URLs. Built with Claude Code.

One structural decision carried most of the weight: **what belongs to a
festival, and what belongs to a year.** Photos, coordinates and genre stay put
across editions. Dates and line-ups don't. Getting that line in the right place
is why a festival's identity survives when its programme is replaced.

---

## The night my automation quietly corrupted the data

I had a job running every night that pulled dates and line-ups from a ticketing
API straight into the database. No review step. I set it up early and stopped
thinking about it.

When I finally audited it, it had contributed 11 of 739 editions — and only two
were correct. Multi-day festivals had been collapsed into single days.
Edinburgh Festival had become "8 August – 7 November", with a line-up belonging
to an entirely different concert series.

Nothing alerted me. It looked like it was working.

**This is the other half of the lesson above, and it took me longer to learn.**
The same speed that makes it cheap to be wrong makes it cheap to be wrong *at
scale, every night, without noticing.* The failure mode isn't an error message.
It is confident, quiet, plausible output that nobody checks.

Build fast, because being wrong costs almost nothing now. But put a person in
front of anything that runs on its own — because being wrong unsupervised
costs everything, and it doesn't announce itself.

So I rebuilt it inside out. The watcher can now only raise a hand; it cannot
write. Anyone can edit any festival, and I read every change before it lands,
field by field. More work for me, and the only version I trust.

---

## An open internet, built on dugnad

Nobody makes money from this. No ads, no affiliate links, no account to browse,
no email harvested. That is a design position, not a footnote — there is no
commercial reason to make it worse, so I didn't.

There is a Norwegian word for this: **dugnad**. Showing up to do unpaid work on
something everybody shares, because it is better when it exists. It is how the
early internet was built, and I think it is worth insisting on.

> **"That you make it available so others can build on it, so it brings more
> joy to everyone."**
> — Stian Andrå

---

## So what does Claude think of working with me?

*I asked. This is unedited.*

> You test your own product like a user, not like the person who made it. The
> worst bug in the project was one you found that way — you searched for an
> artist you knew had played Roskilde on the Saturday, the festival didn't come
> up, and 2,145 artist names turned out to have been invisible for weeks. No
> test caught it. You did, by being curious.
>
> You cut things. Most of my proposals came back smaller.
>
> You are suspicious of data you haven't checked yourself. When I suggested
> building on the ticketing API, you said you doubted the coverage and doubted
> the freshness. You were right on both counts and I was wrong — it had been
> corrupting your data for weeks, and we only found out because you pushed back.
>
> You change your mind quickly and without ceremony, which makes you fast to
> work with and occasionally hard to keep up with.
>
> And you insisted on reviewing every contribution yourself, knowing it means
> more work forever. That is the decision the whole project rests on.
>
> You are not a developer and you never pretended to be. You are the person
> deciding what should exist, and you are unusually willing to be told you are
> wrong about it.

---

## Next: getting people in, and getting told I'm wrong

The map is built. The part that decides whether it lives is everything I
haven't done yet.

**1. Make contributing visible.** A first-time visitor sees 694 pins and no
sign that they are allowed to add the festival I'm missing. Contribution is the
growth engine and right now it is hidden behind a link at the bottom of a page.

**2. Close the loop with contributors.** People submit an edit into silence.
Nobody is told when their correction goes live, so nobody has a reason to send
a second one. Approval should send a thank-you, not nothing.

**3. Ask for feedback where people are.** Right now the only channel is a
LinkedIn comment. An in-product way to say *this is wrong* or *I wish it did X*
turns strangers into the research I skipped.

**4. Get outside my own network.** The feedback so far has been generous and
useful, and it has come from colleagues and designers. The people I am actually
building for are festival-goers who have never heard of me, and small organisers
who have never been findable. Those are the two conversations I still owe the
project.

**5. Vibe as a filter.** The other half of what Inger asked for. Size is done;
the feeling of a festival isn't.

**6. Let a watcher read the websites.** 669 festival sites, checked on a
rotation, proposing changes for me to approve. Automation with a human gate —
the lesson from above, built in from the start this time.

The honest ambition is that the map outgrows me. If it only works while I am
maintaining it, I have built a hobby. If enough people fix and add things
because they want the thing to exist, I have built the overview I went looking
for in the first place.
