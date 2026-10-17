import { handler } from "./core.mjs";
Deno.serve((req: Request) => handler.fetch(req));
