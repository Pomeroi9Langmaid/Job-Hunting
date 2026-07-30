# Job Search Tracker

Searchable Vercel dashboard for Andrew Langmaid's prospective targets, job applications, direct approaches and interview progress.

## Operational source of truth

The main microsite dashboard is the single operational view. It combines:

- `data/applications.csv` for applications, direct-role outreach, speculative emails already sent and previously researched prospective targets.
- `data/vetted-speculative-targets.csv` for newly vetted Gothenburg and Stockholm companies that have not yet been contacted.

The dashboard de-duplicates companies before displaying newly vetted targets.

Each record is classified as one of:

- `Open Role Application`
- `Direct Role Outreach`
- `Speculative Outreach`
- `Prospective Target`

`Prospective Target` means that the company and named contact have been researched, but Andrew has neither applied nor sent a speculative email. Missing direct contact details are shown as `Email needs sourcing`.

## Updating the tracker

Update the appropriate CSV and commit the change to `main`. The connected Vercel project redeploys automatically. Do not create a separate operational target page.
