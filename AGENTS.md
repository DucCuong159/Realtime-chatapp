# Autonomous Agent Directives

## 🚨 MANDATORY STEP 0: CONTEXT & RULES INITIALIZATION
Before analyzing code, creating plans, or performing searches for any task:
1. **Read Memory**: You MUST immediately read `.agent/memory.md` to load the project's tech stack (MongoDB/Mongoose, React 19, Socket.IO, Zustand, Yarn) and immutable architectural constraints.
2. **Read Rules**: You MUST immediately read `.agent/rules.md` to load the SOP, Ponytail anti-over-engineering ladder, and Harness verification protocol.
3. **Load Relevant Skill**: Locate the matching skill in `.agent/skills/` (see Routing Matrix in `rules.md`, e.g., `websocket-socketio-patterns` for realtime/call, `vitest-skill` for testing) and read its `SKILL.md` before writing code.

## 🛠 VERIFICATION & DELIVERY GATE
- Always run `yarn run verify` in `frontend/` (or corresponding tests in `backend/`) after code changes.
- Never bypass tests, disable lint warnings, or fake test results.
- All commits must pass Husky hooks and adhere to Conventional Commits format (`feat:`, `fix:`, `chore:`).
