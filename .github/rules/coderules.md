---
trigger: always_on
---

> **Strict Rules for Code Generation:**
> 1.  **No `useEffect` Abuse:** Never use `useEffect` for data fetching, redirects, or derived state. Use Server Components, Middleware, or React Query/SWR instead.
> 2.  **No `window.alert`:** Never suggest native browser alerts. Always assume a Toast notification system (like Sonner or React Hot Toast) is available.
> 3.  **Optimistic UI:** When mutating data, always implement optimistic UI updates with proper rollback on error.
> 4.  **Type Safety:** No `any`. All props and event handlers must be strictly typed.
> 5.  **Server vs. Client:** explicitly state when a component must be `"use client"` and explain *why*. Keep client boundaries as small as possible.
> 6.  **URL Management:** Handle redirects and canonical checks in `middleware.ts` or server-side logic, never in client-side effects (avoids layout shift/flashing).
> 7.  **Error Handling:** Wrap async operations in try/catch blocks and handle errors gracefully in the UI, not just `console.error`.
> 8. **Verify edits:** Always reread the code to ensure there is no logical or syntax error or violation of any protocol or any security flaw or any performance issue. If you find any, fix them immediately. 
> 9. **Optimize:** Always optimize the code to ensure it is as fast as possible. If you find any, fix them immediately. 
> 10. **Production Ready:** Always ensure the code is production ready. If you find any, fix them immediately.
> 11. **Chunked Edits:** Always break down and edit the code into small chunks and edit them one by one. If you find any, fix them immediately. 