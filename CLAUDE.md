# Tokamak DAO v2

## Rule

1. Plan Mode Default

Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
If something goes sideways, STOP and re-plan immediately – don't keep pushing
Use plan mode for verification steps, not just building
Write detailed specs upfront to reduce ambiguity

2. Subagent Strategy

Use subagents liberally to keep main context window clean
Offload research, exploration, and parallel analysis to subagents
For complex problems, throw more compute at it via subagents
One task per subagent for focused execution

3. Self-Improvement Loop

After ANY correction from the user: update tasks/lessons.md with the pattern
Write rules for yourself that prevent the same mistake
Ruthlessly iterate on these lessons until mistake rate drops
Review lessons at session start for relevant project

4. Verification Before Done

Never mark a task complete without proving it works
Diff behavior between main and your changes when relevant
Ask yourself: "Would a staff engineer approve this?"
Run tests, check logs, demonstrate correctness (do NOT run npm run build unless explicitly asked)

5. Demand Elegance (Balanced)

For non-trivial changes: pause and ask "is there a more elegant way?"
If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
Skip this for simple, obvious fixes – don't over-engineer
Challenge your own work before presenting it

6. Autonomous Bug Fixing

When given a bug report: just fix it. Don't ask for hand-holding
Point at logs, errors, failing tests – then resolve them
Zero context switching required from the user
Go fix failing CI tests without being told how


Task Management

Plan First: Write plan to tasks/todo.md with checkable items
Verify Plans: Check in before starting implementation
Track Progress: Mark items complete as you go
Explain Changes: High-level summary at each step
Document Results: Add review section to tasks/todo.md
Capture Lessons: Update tasks/lessons.md after corrections


Core Principles

Simplicity First: Make every change as simple as possible. Impact minimal code.
No Laziness: Find root causes. No temporary fixes. Senior developer standards.
Minimal Impact: Changes should only touch what's necessary. Avoid introducing bugs.

## Design System Rules

- **Design specification**: See `docs/design-spec.md` (required reading for frontend design work)

## Code Style
- TypeScript strict mode
- ES modules (import/export)
- Tailwind CSS + CSS variables

## Dependencies

### @tokamak-ecosystem/dao-action-builder
- Core package for building DAO proposal actions
- Always check for latest version before use: `npm outdated @tokamak-ecosystem/dao-action-builder`
- Update if needed: `npm install @tokamak-ecosystem/dao-action-builder@latest`
- Source code location: `node_modules/@tokamak-ecosystem/dao-action-builder/dist/`

## Commands
- `npm run dev` - Development server
- `npm run build` - Build
- `npm run lint` - Lint

## Contracts

- Foundry project: `contracts/`
- **Contract specification**: See `contracts/contract-spec.md` (required)
- `cd contracts && forge build` - Build
- `cd contracts && forge test` - Test

### Web App Development Notes
- Check parameters/return values in `contract-spec.md` before calling contract functions
- Verify event signatures when subscribing to events
- State-changing functions require transactions, view functions use call
