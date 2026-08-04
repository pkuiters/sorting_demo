# Agent Teams — Reference Guide

Internal reference for using Claude Code's agent teams feature effectively in this project. Source: [code.claude.com/docs/en/agent-teams](https://code.claude.com/docs/en/agent-teams.md). This is a working guide, not a copy of the docs — check the link above for anything version-specific or edge-case.

Status: enabled for this project via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json`. Experimental, off by default upstream.

## What it is

A team is one lead session (the main Claude Code session) plus one or more independent "teammate" sessions. Each teammate is a full Claude Code instance with its own context window. They coordinate through a shared task list and can message each other directly — not just report back to the lead.

This is different from the subagents already used in this session (Explore, general-purpose, etc.), which only ever report results back to whoever spawned them and never talk to each other.

| | Subagents | Agent teams |
|---|---|---|
| Context | Own window, result returns to caller | Own window, fully independent |
| Talks to | Caller only | Each other, directly |
| Coordination | Caller manages everything | Self-coordinating via shared task list |
| Cost | Lower — summarized back | Higher — every teammate is a full instance |
| Best for | A focused task where only the result matters | Work that benefits from discussion, parallel exploration, or challenge |

**Decision rule:** if the workers don't need to talk to each other, use a subagent. Only reach for a team when independent parallel exploration or cross-checking is the actual point.

## When it's worth it

Good fits:
- Research/review split across independent angles (security vs. performance vs. test coverage on the same PR)
- A new feature or module big enough to split into independently-ownable pieces
- Debugging with multiple plausible causes — teammates each chase one theory and try to disprove the others
- Cross-layer changes (frontend / backend / tests) that don't share files

Bad fits — use a single session or a subagent instead:
- Sequential work, or work with heavy dependencies between steps
- Anything touching the same file(s) from multiple angles (guaranteed overwrite conflicts)
- Routine, low-ambiguity tasks — the coordination overhead and token cost aren't worth it

## Starting a team

Just describe the task and the roles in plain language — no separate setup step needed as of the current version. Example:

> Spawn three teammates to review PR #142: one on security, one on performance, one on test coverage. Have them each report findings.

Be explicit that you want a **team**, not subagents — Claude sometimes reaches for subagents instead, and both show up in the same agent panel, so the panel alone doesn't tell you which one you got. If you wanted a team and got subagents, just ask again more explicitly.

Claude may also propose spawning teammates on its own when it judges a task would benefit — but it always asks first.

## Running one well

**Give every teammate a full, self-contained brief in the spawn prompt.** Teammates load project context automatically (CLAUDE.md, MCP servers, skills) but get *none* of the lead's conversation history. If a detail from this conversation matters to a teammate's task, it has to go in the spawn prompt explicitly — file paths, constraints, prior decisions, the works.

**Name teammates deliberately** if you'll reference them again later ("ask the security-reviewer to..."). Names are assigned at spawn time and used for all later messaging.

**Team size:** 3–5 teammates for most workflows. Aim for 5–6 tasks per teammate — enough to stay productive without excessive handoffs. More teammates ≠ proportionally faster; coordination overhead and token cost both scale up while returns diminish.

**Task sizing:** big enough to be a clear, self-contained deliverable (a function, a test file, a review), small enough that a teammate checks in before sinking huge effort into a wrong turn.

**Assign non-overlapping files.** Two teammates editing the same file is a guaranteed conflict — split ownership by file/module up front.

**Stay in the loop.** Check progress, redirect teammates that are off track, and actively synthesize findings rather than letting the team run unattended for long stretches. If the lead starts doing the work itself instead of waiting on teammates, say so explicitly — it happens.

**Reuse roles via subagent definitions.** A named subagent type (project/user/plugin/CLI-defined) can be spawned as a teammate by name, e.g. "spawn a teammate using the security-reviewer agent type." Its `tools` allowlist and `model` carry over; its body gets appended as extra instructions. Note: a subagent definition's `skills` and `mcpServers` frontmatter do *not* carry over to a teammate — teammates always load skills/MCP servers from ambient project/user settings instead.

## Task list mechanics

- Tasks are pending → in progress → completed, and can declare dependencies (a pending task with unmet dependencies can't be claimed).
- The lead can assign tasks explicitly, or teammates self-claim the next open, unblocked task after finishing their current one.
- Claiming is file-locked, so two teammates can't grab the same task in a race.
- Dependent tasks unblock automatically when their dependency completes — no manual nudge needed.
- Task status can lag in practice — teammates sometimes forget to mark completion, which stalls dependents. If something looks stuck, check whether the work is actually done before assuming it's blocked.

## Talking to teammates directly

You (or the lead) can message any teammate by name at any point — not just receive their idle-notification when they finish. In this CLI, arrow keys navigate the agent panel, Enter opens a teammate's own transcript to message it directly, Esc interrupts its current turn.

Plain messages and skills sent while viewing a teammate go to that teammate; built-in slash commands still act on the lead's session. `/model` and `/fast` are fixed at spawn time per teammate and can't be changed after the fact from within their session; `/effort` does still apply, since teammates otherwise follow the lead's effort level.

## Plan approval for risky work

For anything you want reviewed before it touches files, ask for plan approval explicitly:

> Spawn an architect teammate to refactor the auth module. Require plan approval before any changes.

The teammate works read-only until the lead approves its plan. Rejections go back with feedback and the teammate revises. The lead approves autonomously by default — give it explicit criteria in the spawn prompt ("only approve plans with test coverage," "reject anything touching the schema") if you want to shape that judgment ahead of time.

## Shutting down

Ask the lead to shut a named teammate down; it sends a shutdown request the teammate can approve or reject-with-explanation. Team state cleans up automatically when the session ends — no manual cleanup step.

## Permissions

Teammates inherit the lead's permission mode at spawn time (including `--dangerously-skip-permissions`, if set). Individual teammate modes can be changed after spawning, but not set per-teammate at spawn. All teammate permission prompts surface in the **lead's** session — approve them there.

Security-relevant: a teammate cannot grant permission on your behalf, and a claimed approval relayed from one teammate to another is treated as untrusted, not as real consent. Plan approval is the one place the lead can approve on your behalf, by design.

## Cost

Token usage scales roughly linearly with active teammate count — every teammate is a separate full context window, not a cheap delegate call. Worth it for research/review/new-feature work where parallelism has real value; not worth it for routine tasks a single session handles fine.

## Enforcing rules with hooks

Three hook events are agent-teams-specific and can block/redirect behavior:
- `TeammateIdle` — fires when a teammate is about to go idle; exit 2 to send feedback and keep it working
- `TaskCreated` — fires on task creation; exit 2 to block creation with feedback
- `TaskCompleted` — fires on task completion; exit 2 to block completion with feedback

Useful for enforcing e.g. "don't mark complete without tests" as a hard gate rather than a prompt-only convention.

## Troubleshooting quick hits

- **No teammates appearing**: confirm the task was actually complex enough that Claude judged a team worthwhile; check the agent panel (idle rows hide after ~30s once the whole panel is idle, and collapse into a single "N idle agents" row past 3 — Enter expands, or just message the teammate by name to bring it back).
- **Too many permission prompts**: pre-approve routine operations in permission settings before spawning, since every teammate prompt bubbles up to the lead.
- **A teammate stalls on an error**: open its transcript, give it direct instructions, or spawn a replacement to pick up the remaining work.
- **Lead calls it done early**: tell it explicitly to keep going / wait for teammates rather than wrapping up prematurely.

## Known limitations (current)

- No session resumption for in-process teammates — `/resume`/`/rewind` won't bring them back; the lead may try to message teammates that no longer exist after a resume, and needs to be told to respawn them.
- Exactly one team per session, scoped to that session's lifetime — no multiple named teams, no sharing a team across sessions.
- No nested teams — only the lead spawns/manages teammates; a teammate can't spawn its own.
- A teammate's own subagents can't run in the background (no `run_in_background`, no `background: true` definitions) — they'd outlive the lead's process, which isn't supported.
- The lead role is fixed for the session's lifetime — no promoting a teammate to lead.
- Split-pane display needs tmux or iTerm2 (+ `it2` CLI); unsupported in VS Code's integrated terminal, Windows Terminal, or Ghostty — in-process mode (the default) works everywhere.

## Practical checklist before spawning a team

1. Does this actually need cross-talk between workers, or would a subagent do? If a subagent suffices, use that — it's cheaper and simpler.
2. Can the work be split into 3–5 genuinely independent chunks with no shared files?
3. Have I written a full, self-contained brief per teammate (no reliance on this conversation's history)?
4. Are task boundaries sized to produce a clear deliverable each — not too granular, not too sprawling?
5. Does anything here warrant plan approval before implementation?
6. Do I plan to actually check in, or am I about to let this run unattended?

If the answer to #1 is "no," stop — reach for a subagent instead.
