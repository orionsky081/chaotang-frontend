# Throne feature boundary audit

The rendered boundary diagram is [throne-boundary.html](throne-boundary.html).

## Public-entry allowlist

- `Attendant` and `AttendantLine`
- `RunCard`
- `ImperialEdict`
- `SealStamp`
- `StarterPrompts`

These are view components or explicit presentation props. They do not own a backend command path.

## Prohibited exports

- `CeremonialCompose`
  - Calls `chaotang.decreeDraft` and `chaotang.decreeDispatch`.
  - Locally selects the highest-confidence category before dispatching. This is backend business decision logic and must not become a reusable feature API.
- `lib/plain-language`
  - Contains status and strategy interpretation tables. Keep it private until it is reduced to a backend-provided presentation contract.
- Any direct REST client, dispatch payload builder, category chooser, or state interpretation helper.

## Decision

`dispatchInstruction` is now returned by the backend draft contract and submitted unchanged by `CeremonialCompose`. Keep the command component private until its remaining dispatch UX is reviewed; only then may a public entry expose the allowlisted view components.
