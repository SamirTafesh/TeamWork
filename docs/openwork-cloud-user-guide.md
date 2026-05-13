# OpenWork Cloud User Guide (End-to-End)

This guide explains how to run OpenWork as a team from first sign-up to daily production use.

It covers:
- account creation and email verification
- billing and plan activation
- organization setup
- member/team/role management
- LLM provider setup
- skill hub setup and sharing
- integrations, marketplaces, and plugins
- shared workspaces and daily operations
- security, governance, and troubleshooting

If you still need infrastructure setup on a VM, use this first:
- [Cloud VM setup guide](./cloud-ubuntu-setup-guide.md)

---

## 0. Feature Map (What Each Area Does)

- `Dashboard`: high-level usage and organization status
- `Shared Workspace`: create and manage remote/shared workspaces for teams
- `LLM Providers`: add provider credentials, models, and access policies
- `Skill Hubs`: organize skills by team/function
- `Integrations`: connect external systems (for example GitHub)
- `Marketplaces`: publish and grant access to integrated catalogs
- `Plugins`: inspect available plugin capabilities imported from integrations
- `Members`: invites, teams, and roles
- `API Keys`: org API keys for automation (permission-gated)
- `Billing`: plans, invoices, subscription lifecycle
- `Org Settings`: org profile, domain policy, desktop restrictions

---

## 1. Before You Start

You need:
- running OpenWork Cloud deployment (web + API reachable)
- owner/admin email account
- at least one LLM provider credential (OpenAI, Anthropic, Ollama-compatible, etc.)
- team member emails

Recommended:
- a shared company mailbox or alias for owner/billing notifications
- a team naming convention (`Team`, `Role`, `Skill Hub` names)

---

## 2. Create Your Account

1. Open your Cloud URL (example: `https://openwork.aitech-services.com`).
2. Choose one method:
   - `Sign up with email`
   - `Sign in with provider` (if enabled)
3. If using email, enter email + password.
4. Check inbox for verification OTP code.
5. Enter the 6-digit code in the verify screen.

If email does not arrive:
- click `Resend code`
- check spam/junk
- verify SMTP/provider config on server (see Troubleshooting section)

---

## 3. Billing and Plan Activation

OpenWork Cloud requires an active plan for organization creation/usage.

1. Continue from onboarding.
2. If redirected to checkout, complete payment.
3. Return to OpenWork after payment.
4. Confirm Billing page shows active plan/status.

Admin billing actions available later:
- open billing portal
- view invoices
- change/cancel/resume subscription

---

## 4. Create the Organization

1. From onboarding, create your first organization.
2. Provide:
   - Organization name
   - Slug
3. Save.
4. You will land in org dashboard.

Recommended initial settings:
- set org display identity/logo
- configure allowed email domains
- define desktop version policy (if you require managed desktop versions)

---

## 5. Invite Team and Configure Permissions

Go to `Members` in org dashboard.

### Invite users
1. Click `Invite member`.
2. Enter email.
3. Select role/team access.
4. Send invite.

### Create teams
1. Open `Teams` tab.
2. Click `Create team`.
3. Add users to the team.

### Create custom roles
1. Open `Roles` tab.
2. Click `Create role`.
3. Define permission scope.

### Manage invitations
- monitor pending invites
- cancel/re-issue invites if needed

Role model to start with:
- `Owner`: billing, org settings, full control
- `Admin`: operations, providers, members
- `Member`: day-to-day usage only

---

## 6. Connect LLM Providers (Core Runtime Setup)

Go to `LLM Providers`.

1. Click `Add provider`.
2. Choose one:
   - catalog provider (predefined)
   - custom provider (OpenAI-compatible endpoint)
3. Set provider identity:
   - name
   - adapter type
4. Add credentials/API key.
5. Select and enable models.
6. Define provider/model access grants:
   - org-wide
   - specific teams
   - specific members
7. Save.

Best practices:
- keep one reliable default model for all users
- add specialized models for coding/reasoning/cheap batch tasks
- restrict expensive models to specific teams/roles

---

## 7. Create Skill Hubs and Share Skills

Go to `Skill Hubs`.

### Create a skill hub
1. Click `New skill hub`.
2. Set name and description.
3. Assign visibility/access scope.

### Add skills
1. Open hub.
2. Click `New skill` or `Import`.
3. For import, upload or paste `SKILL.md` content.
4. Set visibility:
   - `private` (owner only)
   - `org` (all org users)
   - `public` (shareable/public use case)
5. Save.

### Team sharing model
Recommended:
- one hub per function (`Engineering`, `Support`, `Ops`, `Sales`)
- org-level shared baseline skills
- private draft skills for iteration before org publishing

---

## 8. Integrations, Marketplaces, and Plugins

Go to `Integrations`.

1. Connect external source (for example GitHub).
2. Authorize account/repositories.
3. Run discovery/import.

Then use:
- `Marketplaces`: view imported marketplace sources and grant access
- `Plugins`: inspect installed plugin artifacts and capabilities

Recommended flow:
1. Integrations -> connect source
2. Marketplaces -> expose curated catalog to org
3. Plugins -> verify what is available to users

---

## 9. Shared Workspace Setup (Team Runtime)

Go to `Shared Workspace`.

1. Click `Add workspace`.
2. Name workspace by team/project.
3. Generate/connect worker token and endpoint.
4. Start worker(s).
5. Share workspace with the right teams.

Desktop users can then:
- open OpenWork desktop
- choose `Add worker` / `Connect remote`
- paste URL/token
- start sessions against shared workspace

---

## 10. API Keys for Automation

Go to `API Keys` (owner/admin as permitted).

1. Create org API key.
2. Store securely in secret manager.
3. Use for automation/integration scripts.
4. Rotate keys on a schedule.

Do not share API keys in chat/email/plain docs.

---

## 11. Org Security and Governance

Go to `Org Settings`.

Configure:
- organization profile
- allowed signup/invite domains
- desktop app restrictions
- allowed desktop versions

Operational guardrails:
- use least privilege on roles
- separate admin and regular user accounts where possible
- review provider access grants monthly
- review plugin/integration trust quarterly

---

## 12. Daily Team Workflow (Reference)

Use this as your standard flow:

1. Member joins via invite.
2. Member enters shared workspace.
3. Member selects approved provider/model.
4. Member runs tasks using org skill hub prompts/skills.
5. Team lead reviews outputs and updates skill definitions.
6. Admin tunes provider routing and permissions.
7. Ops reviews billing and usage trends weekly.

---

## 13. Example Use Cases

### Engineering use case
- Skills: code review checklist, bug triage, release notes
- Models: high-reasoning for architecture, lower-cost for batch refactors
- Integrations: GitHub connector + repo marketplace

### Support use case
- Skills: response tone guide, escalation matrix, FAQ resolver
- Models: fast low-cost model + fallback quality model
- Governance: support team-only access

### Ops use case
- Skills: incident template, postmortem writer, change ticket drafting
- Models: reliable reasoning model with strict prompts
- Governance: private hub + admin-approved publishing

---

## 14. Troubleshooting

### A) Verification email not received
1. Click `Resend code` in UI.
2. Check API logs for OTP endpoints and delivery errors.
3. Validate SMTP/Loops config.
4. Validate DNS (SPF/DKIM/DMARC if using custom SMTP domain).

### B) Social login shows provider not found
- Configure the social provider credentials in auth environment and restart API.

### C) Provider appears but model unusable
- verify API key validity
- verify model ID exact match
- verify team/member access grants include that model

### D) User cannot see skills
- check skill visibility (`private/org/public`)
- check hub access grants and team membership

### E) User can access org but cannot manage billing/members
- expected for non-owner/non-admin roles
- promote role only if needed

---

## 15. Team Rollout Checklist (Copy/Paste)

- [ ] Deployment is healthy (web + API + worker)
- [ ] Owner account created and verified
- [ ] Billing active
- [ ] Organization created
- [ ] Domain and security settings configured
- [ ] Teams and roles created
- [ ] Members invited
- [ ] Primary LLM providers connected
- [ ] Baseline models enabled and access-granted
- [ ] Skill hubs created by function
- [ ] Core skills imported/shared
- [ ] Integrations connected
- [ ] Marketplaces/plugins validated
- [ ] Shared workspaces running
- [ ] API keys generated and stored securely
- [ ] Run first pilot use case with 3-5 users
- [ ] Review usage/cost and tune model permissions

---

## 16. Related Docs

- [Cloud VM setup guide](./cloud-ubuntu-setup-guide.md)
- [Team setup and sharing guide](./team-setup-sharing-guide.md)
- [Local server LAN deployment guide](./local-server-lan-deployment-guide.md)
