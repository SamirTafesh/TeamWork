const home = `# TeamWork

> The open-source Claude Cowork alternative. TeamWork is a desktop app that lets teams chat with 50+ LLMs, bring their own provider keys, and ship reusable agent setups with guardrails.

## What it is

- Desktop app (macOS, Windows, Linux) — GUI for OpenCode
- Bring your own model and provider (OpenAI, Anthropic, local models, 50+ supported)
- Skills, plugins, and MCP servers extend what the agent can do
- Shared agent setups for teams, with policy and guardrails
- Free and open source

## Primary calls-to-action

- **Try it free** — [Download the desktop app](https://teamworklabs.com/download)
- **Hosted cloud workers** — [Pricing](https://teamworklabs.com/pricing) (\\$50/mo per worker)
- **Sign in to the hosted workspace** — [Cloud](https://app.teamworklabs.com)
- **SSO / audit / procurement** — [Enterprise](https://teamworklabs.com/enterprise)
- **Docs** — [teamworklabs.com/docs](https://teamworklabs.com/docs)

## For agents

- Agent skills index — \`/.well-known/agent-skills/index.json\`
- llms.txt — \`/llms.txt\`
- API catalog (RFC 9727) — \`/.well-known/api-catalog\`
- Sitemap — \`/sitemap.xml\`

Backed by Y Combinator.
`

const pricing = `# TeamWork pricing — free, team, and enterprise

> TeamWork has three tiers: free open-source desktop, \\$50/mo Team Starter, and custom Enterprise.

## Solo — \\$0

- Open-source desktop app
- macOS, Windows, Linux downloads
- Bring your own provider keys
- Free forever
- CTA: [Download](https://teamworklabs.com/download)

## Team Starter — \\$50 / month

- 5 seats included
- API access
- Skill Hub Manager
- Bring your own LLM keys, distributed to your team
- CTA: [Start team plan](https://app.teamworklabs.com/checkout)

## Enterprise — Custom pricing

- Enterprise rollout support
- Deployment guidance
- Custom commercial terms
- For org-wide rollout and custom terms
- CTA: [Talk to us](https://teamworklabs.com/enterprise#book)

Prices exclude taxes.
`

const enterprise = `# A privacy-first alternative to Claude Cowork for your organization

> The open-source Claude Cowork alternative — self-hosted, permissioned, and compliance-ready. SSO, audit, custom deployment, and procurement support.

## What Enterprise includes

- Enterprise rollout support and deployment guidance
- Custom commercial terms
- SSO / SAML integration
- Audit logs and policy controls
- Named security contact and incident response

## Deployment models

- Self-hosted desktop app — data stays local, bring your own keys
- Cloud workers — managed by TeamWork, sandbox infrastructure via Daytona (EU)

## Next step

- [Book a call](https://teamworklabs.com/enterprise#book)
- [Security Review](https://teamworklabs.com/trust) — data handling, subprocessors, and incident SLA
- See [Pricing](https://teamworklabs.com/pricing) for tier comparison
`

const download = `# Download TeamWork

> Desktop app for macOS, Windows, and Linux. Latest release published on GitHub.

## macOS

- **Apple Silicon (M-series)** — recommended for M1/M2/M3/M4. \`.dmg\`
- **Intel (x64)** — for Intel-based Macs. \`.dmg\`

## Windows

- **x64** — Electron ".exe" installer

## Linux

- **AppImage** — Electron build for x64 and arm64
- **Tarball** — Electron \`.tar.gz\` build for x64 and arm64

Direct download URLs resolve from the latest GitHub release. Browse all assets at [github.com/teamworklabs/teamwork/releases/latest](https://github.com/teamworklabs/teamwork/releases/latest).

## After installing

Once the desktop app is running, use the [workspace-guide skill](https://teamworklabs.com/.well-known/agent-skills/workspace-guide/SKILL.md) for first-run orientation.
`

const trust = `# Trust & Security

> How TeamWork handles data, what subprocessors are involved, and how to reach the security team.

## Key facts

- **Deployment** — self-hosted desktop app on your machines
- **Data storage** — local-only, nothing leaves your machine in desktop mode
- **LLM keys** — bring your own, sent directly to your provider
- **Telemetry** — none in desktop mode; opt-in feedback only
- **Incident SLA** — 72hr notify, 3-day ack, 7-day triage
- **Subprocessors** — 5 named vendors (cloud & website only)

## Data handling

| Data type | Self-hosted | Cloud |
|---|---|---|
| Source code | Local only | Accessed at runtime via your LLM provider; not stored |
| LLM API keys | Local keychain / env vars | Held by your LLM provider, not by TeamWork |
| Prompts & responses | Local only | Sent to your LLM provider; not logged by TeamWork |
| Usage telemetry | None | Anonymous via PostHog; can be disabled |
| Authentication | Your SSO / SAML | Google or GitHub OAuth |

## Subprocessors

- PostHog — analytics (US/EU)
- Polar — billing (US)
- Google — OAuth (US)
- GitHub — OAuth (US)
- Daytona — cloud sandbox infrastructure (EU)

## Security contact

Omar McAdam — team+security@teamworklabs.com
`

export const agentMarkdown: Record<string, string> = {
  "/": home,
  "/pricing": pricing,
  "/enterprise": enterprise,
  "/download": download,
  "/trust": trust,
}

export const agentMarkdownRoutes = Object.keys(agentMarkdown)
