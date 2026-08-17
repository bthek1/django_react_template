# Plans

Feature plans, ADRs, and roadmaps. Plans move between folders as work progresses.

```
docs/plans/
├── future/        Future project-state docs — where the project is heading
├── in-progress/   Active plans (Status: Draft | In Progress)
└── completed/     Finished plans (Status: Complete) — kept as a record
```

## Lifecycle

```
future/<area>.md  ──sliced into──▶  in-progress/<feature>.md  ──when done──▶  completed/<feature>.md
```

1. **`future/`** holds *desired end-state* documents, not task lists: what a subsystem should
   eventually look like. They are long-lived and may be revised repeatedly.
2. When work starts, carve an increment out of a `future/` doc into a phased plan in
   **`in-progress/`** (`docs/plans/in-progress/<feature-name>.md`). One increment per plan —
   independently deliverable, with a Testing section. A `future/` doc usually produces several.
3. When every phase is checked off and the status is `Complete`, **move the file to
   `completed/`** (`git mv docs/plans/in-progress/<f>.md docs/plans/completed/<f>.md`).
   Completed plans are kept, never deleted.

New plans that don't come from a `future/` doc start directly in `in-progress/`.

## Plan template

```markdown
# Plan: <Feature Name>

**Status:** Draft | In Progress | Complete
**Date:** YYYY-MM-DD

---

## Goal
One paragraph describing what this plan achieves and why.

## Background
Context and motivation. What problem does this solve?

## Phases

Every phase is **stable**: it leaves the repo in a working, shippable state — migrations
applied, existing tests still green, no half-wired code paths — and carries its own tests
that prove it landed.

### Phase 1 — <Name>
**Outcome:** what demonstrably works once this phase lands.

- [ ] Task 1
- [ ] Task 2

**Validation:**
- [ ] `backend/apps/<app>/tests/test_<x>.py::test_<case>` — what it proves
- [ ] `just be-test` and `just fe-test` pass
- [ ] Manual: <steps to see it working>

### Phase 2 — <Name>
**Outcome:** …

- [ ] Task 3

**Validation:**
- [ ] …

## Testing
Cross-cutting strategy only — fixtures/factories introduced, MSW handlers added, coverage
gaps, and the end-to-end manual walkthrough of the finished feature. Per-phase checks live
in the phases above.

## Risks & Notes
Any known risks, open questions, or decisions deferred.

---

> **On completion:** set `Status: Complete` and move this file to `docs/plans/completed/`.
```

Every plan must end with that **On completion** note.

## Rules

- Plans are always phased — discrete, independently deliverable phases.
- **Phases are stable.** Each one ends with the repo working: migrations applied, the existing
  suites green, nothing half-wired. If a phase can only be verified once a later phase lands,
  it is not a phase — merge it into the one that completes it.
- **Every phase carries its own validation.** Name the tests (file + test name) and the manual
  steps that prove the phase is done. Progress is measured by those checks passing, not by
  tasks looking finished.
- The plan-level **Testing** section covers cross-cutting strategy and the end-to-end
  walkthrough; it does not replace per-phase validation.
- No implementation without a plan for anything touching more than one file.
- Update `Status` (`Draft → In Progress → Complete`) as work progresses.
- A plan's folder must match its status — a `Complete` plan does not stay in `in-progress/`.
