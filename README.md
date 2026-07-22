# Job Search Tracker

Searchable Vercel dashboard for Andrew Langmaid's job applications, direct approaches and interview progress.

## Data structure

`data/applications.csv` is the single source of truth. Each activity is classified as one of:

- `Open Role Application`
- `Direct Role Outreach`
- `Speculative Outreach`

The page builds the progress flow from the application date, interview stages and closing status.

## Updating the tracker

Update `data/applications.csv` and commit the change to `main`. The connected Vercel project redeploys automatically.
