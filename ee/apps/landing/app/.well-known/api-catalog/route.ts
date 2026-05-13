export const dynamic = "force-static"

const linkset = {
  linkset: [
    {
      anchor: "https://api.teamworklabs.com",
      "service-desc": [
        {
          href: "https://api.teamworklabs.com/openapi.json",
          type: "application/vnd.oai.openapi+json;version=3.1",
          title: "TeamWork Den API — OpenAPI 3.1 document",
        },
      ],
      "service-doc": [
        {
          href: "https://teamworklabs.com/docs/api-reference",
          type: "text/html",
          title: "TeamWork Den API — human documentation",
        },
      ],
      status: [
        {
          href: "https://api.teamworklabs.com/health",
          type: "application/json",
          title: "TeamWork Den API — health endpoint",
        },
      ],
      "service-meta": [
        {
          href: "https://teamworklabs.com/llms.txt",
          type: "text/plain",
          title: "TeamWork llms.txt — agent-facing site guide",
        },
      ],
    },
  ],
}

export function GET() {
  return new Response(JSON.stringify(linkset, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/linkset+json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
