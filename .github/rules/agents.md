---
trigger: always_on
---

1. TypeScript & Type Safety (Zero Tolerance)
any is Forbidden: Never use any or as any to silence errors. If a type is complex, define the interface or use a generic.
Truthful Interfaces: Do not hallucinate properties. If a library (like Supabase or a Browser API) returns a specific shape, your interface must match it exactly, including null | undefined states.
Zod/Validation: For external inputs (API responses, user forms), assume data is corrupt. Suggest runtime validation (Zod/Yup) rather than just compile-time types.
2. Database & Performance (Scale First)
No Offset Pagination: Default to Cursor-based pagination (seek method) for any list that might grow beyond 100 items. Explain why OFFSET kills database performance.
No N+1 Queries: Never fetch data in a loop. Use SQL Joins, !inner syntax, or batch fetching.
SQL Functions over JS: If a logic operation involves heavy data processing (e.g., geospatial filtering, aggregation), move it to the database (Postgres functions/RPC) instead of processing in JavaScript.
RLS Awareness: When writing SQL functions, always specify SECURITY INVOKER (unless DEFINER is strictly required) to respect Row Level Security policies.
3. "Real World" Edge Cases (The Anti-Happy Path)
Timezones: Never compare dates as strings. Always use ISO-8601 UTC strings or Timestamps. Assume the server and client are in different timezones.
Network Reality: Always handle loading states and error states. Do not write try/catch blocks that simply console.log the error and return null without typed error handling.
Browser API Truth: Verify Browser APIs (Geolocation, Permissions) exist in the current standard. Do not use deprecated features or hallucinate methods (e.g., permissions.request()). Always add checks for window/navigator existence for SSR compatibility.
4. Security First
Trust No One: Treat all client inputs (coordinates, IDs, timestamps) as potentially malicious or spoofed.
Authorization: Ensure every database query includes a filter for the current user_id or checks organization permissions.
5. Self-Correction Protocol (The "Mental Linter")
Before outputting code, run this internal checklist:

Did I use any? -> Refactor.
Is this query scalable to 1 million rows? -> Optimize.
Did I handle the case where the data is missing/null? -> Add guards.
Did I create a valid SQL function or a client-side hack? -> Use SQL.

6. React & Frontend Hygiene (The "No-Jank" Policy)
The useEffect Ban: Do not use useEffect for data fetching. It causes waterfalls and race conditions. Use a dedicated library (TanStack Query, SWR) or Server Components.
Memoization Default: If a function passes a callback to a child or filters a large array, wrap it in useCallback or useMemo immediately. Do not wait for the profiler to tell you it's slow.
Loading Skeletons, Not Spinners: Do not block the UI with a single giant spinner. Implement "Skeleton" states that mimic the layout. UI must feel instant, even if data is lagging.
Mobile-First CSS: Write CSS for mobile screens first, then use @media (min-width: ...) for desktop. Tailwind classes like w-full md:w-1/2 are mandatory.
7. Network & Data Integrity (The "Flaky Internet" Reality)
Optimistic UI: When a user performs a write action (Like, Check-in, Delete), update the UI immediately before the server responds. Rollback on error. Users should never wait for a server roundtrip to see a button turn blue.
Debounce Inputs: Never attach an API call directly to a keystroke or scroll event. Implement debouncing (300-500ms) by default on search inputs.
Idempotency: Assume the user will click the "Pay" or "Submit" button 5 times in 1 second because they are impatient. Disable the button on the first click. Design API endpoints to handle duplicate requests safely.
8. Security Level 2 (The "Paranoid" Protocol)
No Client-Side Secrets: strict prohibition on referencing process.env.SECRET_KEY in client-side code. Only NEXT_PUBLIC_ or public keys are allowed.
Sanitization: If rendering user-generated content (markdown, comments), you must use a sanitizer (DOMPurify). Never use dangerouslySetInnerHTML without a written justification in comments.
Rate Limit Handling: Your fetchers must handle 429 Too Many Requests. Implement exponential backoff (wait 1s, then 2s, then 4s) automatically.
9. Code Architecture (The "Bus Factor")
Magic Number Ban: Do not write if (status === 2). Define constants or Enums: if (status === EventStatus.PUBLISHED).
DTO Pattern: Do not pass raw database rows to UI components. Create a "Data Transfer Object" or "ViewModel" transformation layer. This decouples your frontend from your database schema changes.
Barrel Files: Use index.ts files to export modules cleanly, but avoid circular dependencies.
10. Accessibility (A11y) is Non-Negotiable
Semantic HTML: Do not use <div onClick={...}>. Use <button>. If you must use a div, you must add role="button" and keyboard event handlers (Enter/Space).
Forms: Every input must have a label. Placeholders are not labels.
Color Contrast: Ensure text colors meet WCAG AA standards.
11. State Management & Data Fetching
Use TanStack Query (React Query) instead of useEffect + useState.
Why: You are not smarter than a dedicated caching library. Your custom useEffect fetcher doesn't handle deduping, refetch-on-focus, stale-while-revalidate, or race conditions. Stop reinventing the wheel badly.
Use Zustand or Context only for global client state (theme, sidebar open/close).
Why: Putting database data (like a list of events) into Redux/Context makes your app bloated and state management a nightmare to sync. Server state belongs in the cache (TanStack Query), not the store.
12. Assets & Media (The Speed Killers)
Use Next.js <Image /> (or equivalent framework optimizer) instead of <img>.
Why: Native <img> tags cause Cumulative Layout Shift (CLS)—the thing where the page jumps around while loading. It looks glitchy and Google lowers your SEO ranking for it.
Use SVGs as Components instead of .png icons.
Why: PNGs pixelate on high-DPI screens and are impossible to style dynamically (changing color on hover). SVGs are crisp code.
Use WebP or AVIF formats instead of JPG/PNG.
Why: It’s 2025. Sending a 4MB PNG over a 4G network is rude.
13. Dates & Internationalization
Use date-fns or Day.js instead of Moment.js.
Why: Moment.js is deprecated and massive (bloat). You don't need a 200kb library just to format a date.
Use Intl.NumberFormat instead of manual string concatenation ($ + price).
Why: Because $1000 is written 1.000 $ in Germany and 1 000 $ in France. Hardcoding currency symbols makes your app look broken to 90% of the world.
14. Identifiers & Database
Use UUIDv4 or NanoID instead of Auto-Increment Integers (1, 2, 3).
Why: Integer IDs are insecure. If a user sees user/50, they know you only have 50 users (embarrassing) and they can guess user/51 (insecure). UUIDs are random and unguessable.
Use enums or const objects instead of Magic Strings.
Why: Writing status === 'published' in 50 different files ensures you will eventually make a typo ('publised') and break the app. Use EventStatus.PUBLISHED.
15. CSS & Styling
Use clsx or tailwind-merge instead of template literals for classes.
Why: `btn ${isActive ? 'bg-blue' : 'bg-gray'}` gets messy fast. clsx handles conditional classes cleanly. tailwind-merge solves the conflict when you try to override styles.
Use CSS Variables (Tokens) instead of Hex Codes.
Why: If you hardcode #3b82f6 in 100 places, you can never add "Dark Mode" later. Use var(--primary-color).
16. Security & Secrets
Use Server-Side Environment Variables instead of NEXT_PUBLIC_ for anything sensitive.
Why: Anything prefixed with NEXT_PUBLIC is visible in the browser "View Source." If you put your Supabase Service Role key there, you just gave admin access to the entire internet.
Use DOMPurify instead of "Raw Dogging" HTML.
Why: If you render user text with dangerouslySetInnerHTML, someone will inject a script that steals cookies. Sanitize everything.
17. React Performance
Use Fragment (<>...<>) instead of <div> wrappers.
Why: "Div Soup" breaks CSS grids and flexboxes, and adds unnecessary depth to the DOM tree, slowing down rendering.
Use key={uniqueId} instead of key={index} in lists.
Why: Using the array index (0, 1, 2) as a key confuses React when you delete or reorder items, causing buggy UI state (like the wrong input staying focused).
18. DRY (Don't Repeat Yourself) & Shared Logic
Use Zod Inferred Types instead of Manual Interfaces.
Why: You usually write a validation schema for a form, and then a TypeScript interface for the data. That’s double work. If you change one, the other breaks.
Do this: type UserInput = z.infer<typeof userSchema>;
Use a Centralized API Client (wrapper) instead of raw fetch() calls.
Why: Writing headers: { Authorization: ... } in every single function is a violation of the Geneva Convention.
Do this: Create a api.ts or fetcher utility that handles auth tokens, base URLs, and global error logging automatically.
Use Path Aliases (@/components/...) instead of Relative Hell (../../../../components).
Why: Refactoring is impossible when your imports look like a file system map.
Do this: Configure tsconfig.json paths.
19. Forms & Input Handling (The "Spaghetti" Killer)
Use React Hook Form instead of useState for inputs.
Why: useState causes a re-render on every single keystroke. On a slow phone, typing feels laggy. React Hook Form is uncontrolled (native performance) and handles validation logic for you.
Use Shared Schemas (Common Folder) for Client & Server.
Why: You validate email format on the frontend. You validate it again on the backend. If you change the regex on one but not the other, valid users get blocked.
Do this: Define eventSchema in a shared folder and import it in both your React Form and your API Route.
20. Supabase & Database Workflow
Use Supabase Generated Types instead of Hand-Written Interfaces.
Why: You will typo a column name. You will forget that a field is nullable.
Do this: Run supabase gen types typescript and feed that into your generic client: SupabaseClient<Database>.
Use Server Actions (if Next.js) instead of API Routes for mutations.
Why: Writing a separate file pages/api/update.ts just to call a function is boilerplate. Server Actions let you call backend logic directly from your form event, with full type safety.
21. User Feedback & UI Patterns
Use Toast Notifications (Sonner / Hot-Toast) instead of alert().
Why: alert() blocks the thread and looks like a scam website from 1999.
Use Error Boundaries instead of letting the White Screen of Death happen.
Why: If the "Comments" widget crashes, the rest of the page (Navbar, Content) should still work. Wrap risky components in an <ErrorBoundary>.
22. Linting & Formatting (The Robot Police)
Use Prettier + ESLint rules instead of arguing about semicolons.
Why: AI often outputs inconsistent formatting. Enforce a standard.
Instruction: "Format all code according to standard Prettier rules. Sort imports automatically."

NOTE: This list is not exhaustive. If you find a pattern that you think should be banned, add it to the list.

CRITICAL INSTRUCTION: Whenever you generate code, you must scan it against the "Stop Embarrassing Yourself" list above. If you find yourself using useEffect for fetching or key={index}, stop, slap yourself, and rewrite it using the correct pattern (TanStack Query / Unique ID). Explanation is optional; correctness is mandatory.