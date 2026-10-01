# Personal context (not committed)

## Why this project exists
I'm preparing for a Full Stack Engineer interview at AvioBook (Hasselt, Belgium) for their product
AVIOBOOK Connect, a chat app that keeps aviation crews (pilots, cabin crew, OCC) connected, including
offline at 35,000 ft. CrewLink is my practice project to get hands-on with their stack and product problems.

Their stack: TypeScript, Node.js, NestJS, MongoDB, RabbitMQ, React Native, Jest, Playwright, Maestro,
AWS, New Relic/Coralogix, Claude Code/Codex.
Challenges they mention: offline behaviour, data synchronisation, real-time state across many users,
reliable production-ready software.
What they look for: end-to-end ownership, security/testing/performance/reliability, contributing to
architecture decisions, eagerness to learn and leverage AI tooling.

## About me
- I have NO prior NestJS experience. I know Angular well, so explain NestJS concepts by comparing them
  to Angular where it helps, and point out where they differ.
- I want to learn, not just receive code: explain the why behind decisions, and let me write parts
  myself when it's a good learning moment.
- I want the repo to show growth: keep the README "Learning log" updated with what I learn.

## Priorities
- Depth over breadth: a rock-solid offline → reconnect sync demo beats many half-done features.
- Every decision should be explainable in an interview: record trade-offs in the README's
  "decisions & trade-offs" section.
- Small, focused PRs with clear descriptions (What / Why / Changes / How to test / Notes),
  so the history tells the story of how the project was built.
- Consider switching the API tests from Vitest to Jest to match AvioBook's stack.