# Job Search Tracker

Searchable Vercel dashboard for Andrew Langmaid's prospective targets, job applications, direct approaches and interview progress.

## Operational source of truth

The main microsite dashboard is the single operational view. It combines:

- `data/applications.csv` for advertised-role applications, direct-role outreach and speculative emails already sent.
- `data/vetted-speculative-targets.csv` and `data/vetted-speculative-targets-expanded-gothenburg.csv` for the reviewed Gothenburg queue.
- `data/vetted-speculative-targets-stockholm-1.csv`, `data/vetted-speculative-targets-stockholm-2.csv` and `data/vetted-speculative-targets-expanded-stockholm.csv` for the reviewed Stockholm queue.
- `data/contact-enrichment.csv` for audited professional-email enrichment and contact holds supplied on 31 July 2026.

The dashboard preserves all application and sent-email history. Legacy uncontacted target rows in `data/applications.csv` are replaced in the displayed operational queue by the reviewed city files. Companies already present as applications, direct outreach or sent speculative emails are automatically excluded from the unsent queue.

Each displayed record is classified as one of:

- `Open Role Application`
- `Direct Role Outreach`
- `Speculative Outreach`
- `Prospective Target`

`Prospective Target` means that the company and named contact have been researched, but Andrew has neither applied nor sent a speculative email. Missing direct contact details are shown explicitly as `Email needs sourcing` or the more precise sourcing status in the reviewed data.

## Full population review — updated 31 July 2026

The review evaluated all 1,975 source records: 975 Gothenburg companies and 1,000 Stockholm companies.

Source-population decisions after the Artilleriet and Winningtemp re-review:

- 62 Priority A
- 37 Priority B
- 69 watchlist
- 16 application/outreach history or duplicate records
- 1,791 excluded

The 99 Priority A/B companies are the immediate targets found directly in the two city exports. The operational microsite queue contains 129 prospective targets because it also retains previously vetted, still-unsent companies that were not matched to the current source exports, while Kundo is temporarily held pending a current decision-maker.

Operational queue:

- 129 total prospective targets
- 53 Gothenburg
- 76 Stockholm
- 80 Priority A
- 49 Priority B
- 100 targets with a direct professional email
- 29 targets whose direct professional email remains unsourced

Artilleriet Interiors is retained only as a watchlist record and is not displayed in the active outreach queue. Winningtemp is retained as Priority B with Jacob Österberg, VP Corporate Development, as the target contact.

The 31 July contact-enrichment review added 83 direct professional emails. Gunnebo Safe Storage remains active without a direct email because none was found. Kundo is withheld from the active queue because the supplied Rasmus Kjellman record belongs to Benchmarking Alliance rather than Kundo; a current Kundo decision-maker must be sourced before outreach.

Every displayed prospective target has a named contact. Direct email addresses are shown only when publicly verified or supplied through the audited Genesy enrichment; otherwise the tracker states that the email needs sourcing.

## Updating the tracker

Update the appropriate CSV and commit the change to `main`. The connected Vercel project redeploys automatically. Do not create a separate operational target page.
