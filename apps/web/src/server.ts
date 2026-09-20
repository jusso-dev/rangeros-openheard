import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

const handler = createStartHandler(defaultStreamHandler);

const REQUEST_TIMEOUT_MS = 25_000;
const SECURITY_HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

function secure(response: Response): Response {
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
  return out;
}

export default {
  async fetch(request: Request, _env: unknown, _ctx: ExecutionContext) {
    return secure(await handle(request));
  },
  // Nightly: the public demo workspace goes back to its seed. Bindings come
  // from `cloudflare:workers`, which is live in a scheduled invocation too.
  async scheduled(_controller: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const [{ createDb }, { resetDemoWorkspace }] = await Promise.all([import("@openheard/db"), import("./lib/demo-db")]);
        const { posts } = await resetDemoWorkspace(createDb());
        console.log(`demo reset: ${posts} posts`);
      })(),
    );
  },
};

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  // Clerk handshake and session refresh must run even on public pages.
  const response = await bounded(request, url);
  const out = new Response(response.body, response);
  out.headers.set("cache-control", "private, no-store");
  return out;
}

function bounded(request: Request, url: URL): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error(`request timeout: ${request.method} ${url.host}${url.pathname}`);
      resolve(new Response("Service temporarily unavailable", {
        status: 503,
        headers: { "content-type": "text/plain" },
      }));
    }, REQUEST_TIMEOUT_MS);

    Promise.resolve(handler(request)).then(
      (res: Response) => { clearTimeout(timer); resolve(res); },
      (err: unknown) => { clearTimeout(timer); reject(err); },
    );
  });
}
