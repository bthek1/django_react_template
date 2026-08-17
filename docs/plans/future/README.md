# Future

Future project-state documents: what a subsystem or the product *should* look like once the
work described is done. These are not task lists and they are not phased.

Write one file per area (e.g. `billing.md`, `multi-tenancy.md`, `observability.md`) describing:

- **Target state** — the end picture, concretely enough to build toward.
- **Why** — the motivation and the problems it solves.
- **Gap** — what exists today versus that target.
- **Increments** — a rough list of the slices that could be turned into plans.

When work on one of those increments starts, turn it into a phased plan under
[`../in-progress/`](../in-progress/) and link back to the `future/` doc it came from. A future
doc typically produces several plans over time, and stays here (updated) until its target state
is fully reached — only then move it to [`../completed/`](../completed/).

See [`../README.md`](../README.md) for the full lifecycle and the plan template.
