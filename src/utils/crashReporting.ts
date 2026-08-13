// Lightweight crash/error reporting (no external SDK). Captures unhandled JS
// errors and persists them to a Supabase `crash_reports` table when online.
// Replace/extend with Sentry by adding a DSN later — same surface.
import { supabase } from '../lib/supabase';

let installed = false;

export function installCrashReporting(): () => void {
  if (installed) return () => {};
  installed = true;

  const report = (message: string, stack?: string) => {
    try {
      // Fire-and-forget; never throw from within the handler.
      (async () => {
        try {
          await supabase.from('crash_reports').insert({
            message: String(message).slice(0, 2000),
            stack: stack ? String(stack).slice(0, 4000) : null,
            occurred_at: new Date().toISOString(),
          });
        } catch {}
      })();
    } catch {
      /* ignore */
    }
  };

  const prevHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    report(error?.message || String(error), error?.stack);
    prevHandler(error, isFatal);
  });

  return () => {
    ErrorUtils.setGlobalHandler(prevHandler);
    installed = false;
  };
}
