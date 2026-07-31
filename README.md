# Job Search Tracker

Searchable Vercel dashboard for Andrew Langmaid's prospective targets, job applications, direct approaches and interview progress.

## Operational source of truth

The main microsite dashboard is the single operational view. It combines:

- `data/applications.csv` for advertised-role applications, direct-role outreach and speculative emails already sent.
- `data/vetted-speculative-targets.csv` and `data/vetted-speculative-targets-expanded-gothenburg.csv` for the reviewed Gothenburg queue.
- `data/vetted-speculative-targets-stockholm-1.csv`, `data/vetted-speculative-targets-stockholm-2.csv` and `data/vetted-speculative-targets-expanded-stockholm.csv` for the reviewed Stockholm queue.
- `data/contact-enrichment.csv` for audited professional-email enrichment and contact holds supplied on 31 July 2026.
- `data/full-cycle-holds-2026-07-31.csv` for companies removed from immediate outreach after the full-cycle sales re-audit.
- `data/re-audit-additions-2026-07-31.csv` for companies the earlier partnerships-heavy model wrongly excluded or left on the watchlist.

The dashboard preserves all application and sent-email history. Legacy uncontacted target rows in `data/applications.csv` are replaced in the displayed operational queue by the reviewed city files. Companies already present as applications, direct outreach or sent speculative emails are automatically excluded from the unsent queue.

Each displayed record is classified as one of:

- `Open Role Application`
- `Direct Role Outreach`
- `Speculative Outreach`
- `Prospective Target`

`Prospective Target` means that the company and named contact have been researched, but Andrew has neither applied nor sent a speculative email. Missing direct contact details are shown explicitly as `Email needs sourcing` or the more precise sourcing status in the reviewed data.

## Full population review

The review evaluated all 1,975 source records: 975 Gothenburg companies and 1,000 Stockholm companies. The full audit and watchlist remain retained as research history; the operational queue is deliberately narrower than the population of commercially plausible companies.

## Full-cycle sales re-audit — 31 July 2026

The earlier model over-weighted international footprint, business development and partnerships. It under-weighted Andrew's primary identity as a hands-on full-cycle international salesperson and new-business hunter, and it did not treat genuine product interest and a credible sales motion as sufficiently strong gates.

The corrective re-audit therefore:

- moved 43 weak-fit companies from active outreach to an auditable hold status;
- retained Kundo on its existing contact hold;
- added 7 companies previously excluded or left on the watchlist despite stronger full-cycle sales relevance;
- changed the displayed target family to `Full-cycle international sales / new business`;
- retained Magma Math, POC and Miramis Technologies as watchlist-only candidates pending suitable English-first role evidence.

Operational queue after correction:

- 93 total prospective targets
- 32 Gothenburg
- 61 Stockholm
- 72 Priority A
- 21 Priority B
- 67 targets with a direct professional email
- 26 targets whose direct professional email remains unsourced

Gunnebo Safe Storage is not a self-storage operator; it manufactures safes, vaults and specialist physical-security systems. It was nevertheless a poor target for Andrew because the product, industrial-security domain and specialist sales motion are not a strong match. It is now held and does not appear in active outreach.

Newly activated after the re-audit:

- Juni — Priority B; conditional future English-first international sales remit only
- Kustom — Priority A
- Safe Life AB — Priority A
- Evam — Priority A
- Agaton — Priority A
- DEMA — Priority A
- Natlink — Priority B

Every displayed prospective target has a named contact. Direct email addresses are shown only when publicly verified or supplied through the audited Genesy enrichment; otherwise the tracker states that the email needs sourcing.

## Updating the tracker

Update the appropriate CSV and commit the change to `main`. The connected Vercel project redeploys automatically. Do not create a separate operational target page.
