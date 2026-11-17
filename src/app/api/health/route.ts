// Health check used by CI
export function GET() {
  return Response.json(
    {
      status: "ok"
    }, {
      headers: { "Cache-Control": "no-store" }
    });
}
