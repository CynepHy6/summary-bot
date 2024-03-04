export { serve } from "https://deno.land/std@0.218.2/http/server.ts";
export { TextLineStream } from "https://deno.land/std@0.218.2/streams/text_line_stream.ts";

import { loadSync } from "https://deno.land/std@0.218.2/dotenv/mod.ts";
await loadSync({
  envPath: "/root/summary-bot/.env",
  export: true,
});
