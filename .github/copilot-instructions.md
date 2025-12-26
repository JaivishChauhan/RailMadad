# RailMadad AI Coding Assistant Guidelines

## Project Overview

RailMadad is a multilingual Indian Railway grievance platform with an AI chatbot that handles complaints in multiple Indian languages. The app supports two user roles: passengers (filing complaints) and railway officials (managing complaints).

**Status**: Prototype/Demo application (see `docs/FEATURES_AND_BUGS_AUDIT.md` for known limitations)

## Architecture Pattern

- **Dual Auth System**: Separate authentication contexts for passengers (`usePassengerAuth`) and officials (`useAdminAuth`) with role-based routing via `PassengerRoute`/`AdminRoute` components
- **AI-Driven Workflows**: Gemini API integration with function calling for structured complaint submission via `submitComplaintTool` in `geminiService.ts`
- **Real-time Data Validation**: Station and train validation services use actual Indian Railway datasets loaded at app startup
- **Language Detection**: Automatic multilingual support through system prompts rather than explicit detection logic
- **User-Complaint Association**: Complaints are linked to users via typed `userEmail` field in `Complaint` interface

## Key Data Structures

### Railway Data Integration

```typescript
// Station/train data loaded from JSON at startup in App.tsx
await initializeStationsDatabase(); // Loads indian-railway-stations-2025-08-16.json
await initializeTrainsDatabase(); // Loads indian-railways-trains-2025-08-16.json
```

### Complaint Interface (types.ts)

```typescript
interface Complaint {
  id: string;
  userEmail?: string; // Links complaint to user for filtering
  complainantId?: string; // Optional user ID reference
  // ... other fields
}
```

### Complaint Flow

1. User interacts with `Chatbot.tsx` (multilingual, voice/file support)
2. AI validates stations/trains using `smartStationValidation`/`smartTrainValidation`
3. Structured data extraction via Gemini function calling
4. Complaint stored via `useComplaints` hook with `userEmail` for user association
5. Passengers see only their complaints; admins see all

## Critical Patterns

### Environment Setup

```bash
# Required: Set GEMINI_API_KEY in .env for chatbot functionality
pnpm install && pnpm dev
```

### Role-Based Components

- Use `usePassengerAuth`/`useAdminAuth` directly instead of generic `useAuth`
- Admin routes: `/admin-login`, `/admin-register`, `/dashboard/*`
- Passenger routes: `/passenger-login`, `/passenger-register`, `/status`, `/submit`, `/suggestions`
- Default passenger redirect after login: `/status` (not `/passenger/dashboard`)

### Data Validation Services

- `stationValidationService.ts`: Real-time station code/name validation
- `trainValidationService.ts`: Train number/name validation with fuzzy matching
- Both services use cached data loaded from actual Railway datasets

### Complaint Categories

- Structured in `complaintData.ts` with TRAIN/STATION areas
- Each category has specific sub-types (Security, Cleanliness, Medical, etc.)
- Used for complaint classification and routing

## Development Workflows

### Adding New Features

1. Check role requirements (passenger vs admin)
2. Update appropriate auth context if needed
3. Add validation in relevant service if data-driven
4. Follow existing component patterns in `pages/` directory

### Chatbot Modifications

- System prompts in `RAILMADAD_CHAT_SYSTEM_PROMPT`
- Function calling tools in `submitComplaintTool`
- File/voice handling in `Chatbot.tsx` with base64 conversion
- Markdown parsing with XSS protection

### Testing Data Changes

Use test files for validation:

- `test-station-validation.ts`: Station lookup testing
- `test-trains.ts`: Train validation testing
- `test-data-loading.ts`: Database initialization testing

## Integration Points

- **Gemini AI**: Function calling for structured data extraction and multilingual support
- **React Router**: Role-based routing with protected routes
- **Vite**: Environment variable injection for API keys via `define` config
- **Indian Railway Data**: Real station/train datasets with fuzzy search capabilities

## Debugging Notes

- Check browser console for data loading errors during app startup
- Verify GEMINI_API_KEY is set correctly in environment
- Use `debug-station-console.js` for station validation debugging
- Railway data loading happens asynchronously in `App.tsx` useEffect

## Production coding rules for AI agents

This repository is production-facing. Any automated changes must follow this disciplined workflow to avoid regressions and low-quality code.

### Golden rules

- Think before you type: plan, validate assumptions, then edit. Keep edits minimal and scoped.
- Never invent files, APIs, or paths. Verify with repo search or file reads first.
- Prefer editing existing modules over creating new ones unless clearly needed.
- Preserve public APIs and component props unless a breaking change is explicitly requested and migrated.
- Write once, verify twice: typecheck/lint/build locally after edits and fix issues before concluding.

### Required workflow (each change)

1. Plan
   - Extract explicit requirements into a short checklist.
   - Identify impacted files and functions; confirm via search/reads.
   - Note 1–2 assumptions if under-specified (state them in the PR/commit message).
2. Implement
   - Make the smallest necessary diff. Avoid unrelated reformatting.
   - Follow existing patterns:
     - React pages/components live under `pages/` and `components/`.
     - Auth: use `usePassengerAuth` and `useAdminAuth` directly.
     - Data validation goes in `services/*ValidationService.ts`.
     - Complaint logic via `hooks/useComplaints*.tsx`.
   - Use strong typing (TypeScript). Prefer explicit interfaces from `types.ts`.
3. Verify
   - Run typecheck and build. Address all errors/warnings you introduced.
   - Run quick tests: `test-*.ts` files for stations/trains/data loading.
   - Smoke test critical flows (auth, chatbot init, data-loading logs) if touched.
4. Document
   - Update inline comments where logic is non-obvious.
   - If behavior changes, add a brief note in README or the relevant file header.

### Do/Don’t for this repo

- Do
  - Use `stationValidationService.ts` and `trainValidationService.ts` for any station/train logic; don’t duplicate datasets or logic.
  - Keep role-based routing intact; use `/admin-*` and `/passenger-*` paths for auth, `/status` for passenger home.
  - Use typed `userEmail` field in `Complaint` interface (not ad-hoc `as any` casts).
  - Use Gemini function calling via `submitComplaintTool` in `services/geminiService.ts` for complaint extraction.
  - Load datasets via app startup utilities; don't import JSON ad hoc in random files.
  - Sanitize/escape any user-facing markdown or content.
  - Document prototype limitations in `docs/FEATURES_AND_BUGS_AUDIT.md`.
- Don't
  - Don't hardcode secrets or keys. Use environment variables (see Vite and `.env.local`).
  - Don't bypass auth contexts with generic or custom global auth.
  - Don't introduce new complaint categories without updating `data/complaintData.ts`.
  - Don't add libraries without clear necessity and minimal footprint.
  - Don't use `/passenger/dashboard` - it doesn't exist; use `/status` instead.

### Checklists

Implementation checklist (per change):

- [ ] Requirements parsed and listed
- [ ] Impacted files confirmed by search/read
- [ ] Smallest-diff implementation
- [ ] Types added/updated; no any leaks
- [ ] Unit/utility tests executed (where applicable)
- [ ] Build/typecheck clean
- [ ] Docs/comments updated (if needed)

Edge cases to consider:

- Empty/invalid station codes or train numbers (fallbacks and user feedback)
- Missing `GEMINI_API_KEY` (graceful degradation for chatbot features)
- Async dataset loading order and race conditions on first load
- Role guard mismatches (passenger accessing admin routes and vice versa)
- Large messages/files in chatbot (size limits and safe parsing)

### Tooling expectations

- Use repository search and file reads to verify symbols and paths before edits.
- After substantive edits, run:
  - Typecheck/build via the project’s scripts.
  - Targeted test scripts: `test-station-validation.ts`, `test-trains.ts`, `test-data-loading.ts`.
- If you modify public behavior, add or adjust a minimal test.

### Commit hygiene

- One logical change per commit; clear message summarizing the why and the delta.
- Reference the checklist status in the commit message footer when practical.

## Global AI editing principles (summary)

- Repo-local precedence: Follow this file’s rules first; treat any global coding guide as defaults when specifics are absent.
- AI-driven workflow: Plan → Implement (smallest diff) → Verify (typecheck/build/tests/smoke) → Document.
- Quality gates: Build/Lint/Typecheck/Tests/Smoke must pass; no new warnings.
- Safety guardrails: Don’t invent files/APIs/paths; no secrets; don’t edit without full context; make atomic edits.
- Safe refactoring & backups: Create a project-level `backups/` folder; copy originals with `.backup` for first copy and timestamped `.edit.backup` for iterations; mirror path under `backups/`. Keep backups by default for restore checkpoints.

### Failure fallback

- If you encounter repeated typecheck/build/test failures or cannot apply edits cleanly after two attempts, pause and re-align with the global Main instructions (Plan → Implement → Verify → Document, safety guardrails, and Safe Refactoring Protocol). Prefer reverting to the latest `.backup` and re-plan before trying again.
