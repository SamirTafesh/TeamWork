import nodemailer, { type Transporter } from "nodemailer"
import { env } from "./env.js"

const LOOPS_TRANSACTIONAL_API_URL = "https://app.loops.so/api/v1/transactional"
const SMTP_NETWORK_ERROR_CODES = new Set([
  "ECONNECTION",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ESOCKET",
  "EDNS",
])
type DenEmailTemplate = "verification" | "organization_invite"
type DenEmailProvider = "smtp" | "loops" | "none"

let smtpTransporter: Transporter | null = null

/**
 * Error thrown when a transactional email send fails or is skipped because
 * of misconfiguration. Handlers can inspect `.reason` to decide how to
 * surface the failure to the caller (e.g. map to an HTTP status).
 */
export class DenEmailSendError extends Error {
  readonly reason:
    | "provider_not_configured"
    | "provider_rejected"
    | "provider_network"
  readonly provider: DenEmailProvider
  readonly template: DenEmailTemplate
  readonly recipient: string
  readonly detail?: string

  constructor(input: {
    template: DenEmailTemplate
    reason: DenEmailSendError["reason"]
    provider: DenEmailProvider
    recipient: string
    detail?: string
  }) {
    super(
      `[${input.template}] email for ${input.recipient} failed: ${input.reason} via ${input.provider}${
        input.detail ? ` (${input.detail})` : ""
      }`,
    )
    this.name = "DenEmailSendError"
    this.reason = input.reason
    this.provider = input.provider
    this.template = input.template
    this.recipient = input.recipient
    this.detail = input.detail
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function loopsTransactionalIdForTemplate(template: DenEmailTemplate) {
  return template === "verification"
    ? env.loops.transactionalIdDenVerifyEmail
    : env.loops.transactionalIdDenOrgInviteEmail
}

function getLoopsConfigIssue(template: DenEmailTemplate): string | null {
  if (!env.loops.apiKey) {
    return "LOOPS_API_KEY is missing"
  }

  if (!loopsTransactionalIdForTemplate(template)) {
    return template === "verification"
      ? "LOOPS_TRANSACTIONAL_ID_DEN_VERIFY_EMAIL is missing"
      : "LOOPS_TRANSACTIONAL_ID_DEN_ORG_INVITE_EMAIL is missing"
  }

  return null
}

function getSmtpConfigIssue(): string | null {
  const missing: string[] = []
  if (!env.smtp.host) {
    missing.push("SMTP_HOST")
  }

  if (!env.smtp.from) {
    missing.push("SMTP_FROM")
  }

  if (!Number.isFinite(env.smtp.port) || env.smtp.port < 1 || env.smtp.port > 65535) {
    missing.push("SMTP_PORT")
  }

  if (env.smtp.user && !env.smtp.pass) {
    missing.push("SMTP_PASS (required when SMTP_USER is set)")
  }

  if (!env.smtp.user && env.smtp.pass) {
    missing.push("SMTP_USER (required when SMTP_PASS is set)")
  }

  if (missing.length > 0) {
    return `missing or invalid: ${missing.join(", ")}`
  }

  return null
}

function resolveEmailProvider(template: DenEmailTemplate, recipient: string): "smtp" | "loops" {
  const smtpIssue = getSmtpConfigIssue()
  if (!smtpIssue) {
    return "smtp"
  }

  const loopsIssue = getLoopsConfigIssue(template)
  if (!loopsIssue) {
    return "loops"
  }

  throw new DenEmailSendError({
    template,
    reason: "provider_not_configured",
    provider: "none",
    recipient,
    detail: `SMTP ${smtpIssue}; Loops ${loopsIssue}`,
  })
}

function getSmtpTransporter() {
  if (smtpTransporter) {
    return smtpTransporter
  }

  smtpTransporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user
      ? {
          user: env.smtp.user,
          pass: env.smtp.pass,
        }
      : undefined,
  })

  return smtpTransporter
}

function formatEmailErrorDetail(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown error"
  }

  const detailParts: string[] = []
  const code = (error as { code?: unknown }).code
  const response = (error as { response?: unknown }).response
  if (typeof code === "string" && code.trim()) {
    detailParts.push(code)
  }

  if (typeof response === "string" && response.trim()) {
    detailParts.push(response)
  }

  if (error.message.trim()) {
    detailParts.push(error.message.trim())
  }

  return detailParts.join(": ") || "Unknown error"
}

function isSmtpNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const code = (error as { code?: unknown }).code
  if (typeof code === "string" && SMTP_NETWORK_ERROR_CODES.has(code)) {
    return true
  }

  const message = error.message.toLowerCase()
  return message.includes("timed out") || message.includes("connection")
}

async function sendSmtpEmail(input: {
  template: DenEmailTemplate
  email: string
  subject: string
  text: string
  html: string
}) {
  const smtpIssue = getSmtpConfigIssue()
  if (smtpIssue) {
    throw new DenEmailSendError({
      template: input.template,
      reason: "provider_not_configured",
      provider: "smtp",
      recipient: input.email,
      detail: smtpIssue,
    })
  }

  let info: Awaited<ReturnType<Transporter["sendMail"]>>
  try {
    info = await getSmtpTransporter().sendMail({
      from: env.smtp.from!,
      to: input.email,
      replyTo: env.smtp.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })
  } catch (error) {
    throw new DenEmailSendError({
      template: input.template,
      reason: isSmtpNetworkError(error) ? "provider_network" : "provider_rejected",
      provider: "smtp",
      recipient: input.email,
      detail: formatEmailErrorDetail(error),
    })
  }

  if (Array.isArray(info.accepted) && info.accepted.length > 0) {
    return
  }

  const rejected = Array.isArray(info.rejected)
    ? info.rejected.map((value: unknown) => String(value)).filter(Boolean)
    : []

  throw new DenEmailSendError({
    template: input.template,
    reason: "provider_rejected",
    provider: "smtp",
    recipient: input.email,
    detail:
      rejected.length > 0
        ? `SMTP server rejected recipient(s): ${rejected.join(", ")}`
        : "SMTP server did not accept any recipients",
  })
}

async function postLoopsTransactional(input: {
  template: DenEmailTemplate
  email: string
  dataVariables: Record<string, string>
}): Promise<void> {
  const loopsIssue = getLoopsConfigIssue(input.template)
  if (loopsIssue) {
    throw new DenEmailSendError({
      template: input.template,
      reason: "provider_not_configured",
      provider: "loops",
      recipient: input.email,
      detail: loopsIssue,
    })
  }

  const transactionalId = loopsTransactionalIdForTemplate(input.template)!
  let response: Response
  try {
    response = await fetch(LOOPS_TRANSACTIONAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.loops.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transactionalId,
        email: input.email,
        dataVariables: input.dataVariables,
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new DenEmailSendError({
      template: input.template,
      reason: "provider_network",
      provider: "loops",
      recipient: input.email,
      detail: message,
    })
  }

  if (response.ok) {
    return
  }

  let detail = `status ${response.status}`
  try {
    const payload = (await response.json()) as { message?: string }
    if (payload.message?.trim()) {
      detail = payload.message
    }
  } catch {
    // Ignore invalid upstream payloads.
  }

  throw new DenEmailSendError({
    template: input.template,
    reason: "provider_rejected",
    provider: "loops",
    recipient: input.email,
    detail,
  })
}

export async function sendDenVerificationEmail(input: {
  email: string
  verificationCode: string
}) {
  const email = input.email.trim()
  const verificationCode = input.verificationCode.trim()

  if (!email || !verificationCode) {
    return
  }

  if (env.devMode) {
    console.info(`[auth] dev verification email payload for ${email}: ${JSON.stringify({ verificationCode })}`)
    return
  }

  const provider = resolveEmailProvider("verification", email)
  if (provider === "smtp") {
    await sendSmtpEmail({
      template: "verification",
      email,
      subject: "Your TeamWork verification code",
      text: [
        "Your TeamWork verification code:",
        verificationCode,
        "",
        "This code expires in 10 minutes.",
        "If you did not request this code, you can ignore this email.",
      ].join("\n"),
      html: [
        "<p>Your TeamWork verification code:</p>",
        `<p><strong>${escapeHtml(verificationCode)}</strong></p>`,
        "<p>This code expires in 10 minutes.</p>",
        "<p>If you did not request this code, you can ignore this email.</p>",
      ].join(""),
    })
    return
  }

  await postLoopsTransactional({
    template: "verification",
    email,
    dataVariables: { verificationCode },
  })
}

export async function sendDenOrganizationInvitationEmail(input: {
  email: string
  inviteLink: string
  invitedByName: string
  invitedByEmail: string
  organizationName: string
  role: string
}) {
  const email = input.email.trim()

  if (!email) {
    return
  }

  if (env.devMode) {
    console.info(
      `[auth] dev organization invite email payload for ${email}: ${JSON.stringify({
        inviteLink: input.inviteLink,
        invitedByName: input.invitedByName,
        invitedByEmail: input.invitedByEmail,
        organizationName: input.organizationName,
        role: input.role,
      })}`,
    )
    return
  }

  const provider = resolveEmailProvider("organization_invite", email)
  if (provider === "smtp") {
    const organizationName = input.organizationName.trim()
    const invitedByName = input.invitedByName.trim()
    const invitedByEmail = input.invitedByEmail.trim()
    const role = input.role.trim()
    const inviteLink = input.inviteLink.trim()
    const inviterDisplay = invitedByEmail
      ? `${invitedByName} (${invitedByEmail})`
      : invitedByName

    await sendSmtpEmail({
      template: "organization_invite",
      email,
      subject: `Invitation to join ${organizationName} on TeamWork`,
      text: [
        `You are invited to join ${organizationName} on TeamWork.`,
        "",
        `Invited by: ${inviterDisplay}`,
        `Role: ${role}`,
        "",
        `Accept invitation: ${inviteLink}`,
      ].join("\n"),
      html: [
        `<p>You are invited to join <strong>${escapeHtml(organizationName)}</strong> on TeamWork.</p>`,
        `<p>Invited by: ${escapeHtml(inviterDisplay)}<br />Role: ${escapeHtml(role)}</p>`,
        `<p><a href="${escapeHtml(inviteLink)}">Accept invitation</a></p>`,
      ].join(""),
    })
    return
  }

  await postLoopsTransactional({
    template: "organization_invite",
    email,
    dataVariables: {
      inviteLink: input.inviteLink,
      invitedByName: input.invitedByName,
      invitedByEmail: input.invitedByEmail,
      organizationName: input.organizationName,
      role: input.role,
    },
  })
}
