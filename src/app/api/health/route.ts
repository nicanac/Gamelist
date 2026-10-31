/** Liveness probe for the Docker HEALTHCHECK (nicode / Dokploy). */
export function GET() {
  return Response.json({ ok: true });
}
