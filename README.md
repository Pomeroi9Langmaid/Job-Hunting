# Job Search Tracker

Searchable Vercel dashboard for Andrew Langmaid's prospective targets, job applications, direct approaches and interview progress.

## Operational source of truth

The main microsite dashboard is the single operational view. It combines:

- `data/applications.csv` for advertised-role applications, direct-role outreach and speculative emails already sent.
- `data/vetted-speculative-targets.csv` and `data/vetted-speculative-targets-expanded-gothenburg.csv` for the reviewed Gothenburg queue.
- `data/vetted-speculative-targets-stockholm-1.csv`, `data/vetted-speculative-targets-stockholm-2.csv` and `data/vetted-speculative-targets-expanded-stockholm.csv` for the reviewed Stockholm queue.
- `data/contact-enrichment.csv` for the first audited professional-email enrichment batch supplied on 31 July 2026.
- `data/contact-enrichment-batch-2-2026-07-31.csv` for the second audited Genesy batch, including accepted emails, unresolved contacts and contact holds.
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

## Second Genesy contact review — 31 July 2026

The uploaded export was reconciled against the 26 contacts sent for enrichment. It contained 25 exported rows and 22 populated professional-email fields. Nineteen addresses were accepted and saved after company/contact matching. Outside-company matches were rejected rather than attached to the wrong target.

GWEN and Truvio are temporarily held:

- GWEN: Carl Bjerkne is now shown at GuestXP, and the supplied `guestxp.io` address is not a GWEN email.
- Truvio: the supplied Michael Teixeira records belong to Pacera and BYmyCAR BMW; Truvio identifies Joakim Alm as CEO.

Operational queue after the second contact review:

- 91 total prospective targets
- 31 Gothenburg
- 60 Stockholm
- 71 Priority A
- 20 Priority B
- 86 targets with a direct professional email
- 5 active targets whose direct professional email remains unsourced

The five active targets still requiring a direct professional email are Runway Safe, Grale, Metapic, Petbuddy Group and Speria. Each has a retained named contact and a documented source. GWEN and Truvio do not appear in the active queue until their contact records are corrected.

Gunnebo Safe Storage is not a self-storage operator; it manufactures safes, vaults and specialist physical-security systems. It was nevertheless a poor target for Andrew because the product, industrial-security domain and specialist sales motion are not a strong match. It is held and does not appear in active outreach.

Newly activated after the re-audit:

- Juni — Priority B; conditional future English-first international sales remit only
- Kustom — Priority A
- Safe Life AB — Priority A
- Evam — Priority A
- Agaton — Priority A
- DEMA — Priority A
- Natlink — Priority B

Every displayed prospective target has a named contact. Direct email addresses are shown only when publicly verified or supplied through an audited Genesy enrichment; otherwise the tracker states that the email needs sourcing.

## Updating the tracker

Update the appropriate CSV and commit the change to `main`. The connected Vercel project redeploys automatically. Do not create a separate operational target page.
