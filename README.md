# Job Search Tracker

Searchable Vercel dashboard for Andrew Langmaid's prospective targets, job applications, direct approaches and interview progress.

## Operational source of truth

The main microsite dashboard is the single operational view. It combines:

- `data/applications.csv` for advertised-role applications, direct-role outreach and speculative emails already sent.
- `data/vetted-speculative-targets.csv` for the fully reviewed Gothenburg queue.
- `data/vetted-speculative-targets-stockholm-1.csv` and `data/vetted-speculative-targets-stockholm-2.csv` for the fully reviewed Stockholm queue.

The dashboard preserves all application and sent-email history. Legacy uncontacted target rows in `data/applications.csv` are replaced in the displayed operational queue by the fully reviewed city files. Companies already present as applications, direct outreach or sent speculative emails are automatically excluded from the unsent queue.

Each displayed record is classified as one of:

- `Open Role Application`
- `Direct Role Outreach`
- `Speculative Outreach`
- `Prospective Target`

`Prospective Target` means that the company and named contact have been researched, but Andrew has neither applied nor sent a speculative email. Missing direct contact details are shown explicitly as `Email needs sourcing` or the more precise sourcing status in the reviewed data.

## Current reviewed city population

The 30 July 2026 review screened 975 Gothenburg companies and 1,000 Stockholm companies against Andrew's role, language, seniority, sector and commercial-model criteria. The displayed active queue contains 87 companies: 36 Gothenburg and 51 Stockholm. Priority A is the first outreach wave; Priority B is a conditional second wave.

## Updating the tracker

Update the appropriate CSV and commit the change to `main`. The connected Vercel project redeploys automatically. Do not create a separate operational target page.
