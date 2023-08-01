# deno_ics_parser
Deno-compatible ICS parser with support for recurring events. It is heavily inspired by [ics-parser](https://github.com/AnyFetch/ics-parser).

Uses [rrule](https://github.com/jakubroztocil/rrule) v2 as a dependency (from the [jsdelivr](https://cdn.jsdelivr.net/npm/rrule@2/+esm) CDN).


## Usage Example (in Supabase Edge functions)

Getting all names of events happening tomorrow:

```TypeScript
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import parseICS from "../_shared/ics_parser.ts";
const icsUrl = "https://calendar.google.com/calendar/ical/.../private/basic.ics";

serve(async (req: Request) => {
    const res = await fetch(icsUrl);
    const icsData = await res.text();
    const events = parseICS(icsData);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const tomorrow_events = events.filter(event => {
      const startDate = new Date(event.startDate!);
      const isTomorrow = startDate.getDate() === tomorrow.getDate() &&
                         startDate.getMonth() === tomorrow.getMonth() &&
                         startDate.getFullYear() === tomorrow.getFullYear();
      if (isTomorrow) {
        return true;
      }
      if (event.rrule) {
        const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
        const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()+1);
        const occurrences = event.rrule.between(tomorrowStart, tomorrowEnd);
        return occurrences.length > 0;
      }
      return false;
    });
    const tomorrow_event_names = tomorrow_events.map(event => event.name);
    return new Response(JSON.stringify(tomorrow_event_names,null,2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

```
