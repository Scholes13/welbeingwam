import { createHmac, timingSafeEqual } from 'node:crypto'

type DateLike = Date | string

type TokenPayload = {
  activityId: string
  expiresAt: string
}

function toDate(value: DateLike): Date {
  return value instanceof Date ? value : new Date(value)
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function signPayload(payloadPart: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadPart).digest('base64url')
}

export function createActivityScanToken(input: {
  activityId: string
  secret: string
  expiresInSeconds?: number
  now?: DateLike
}): string {
  const expiresInSeconds = input.expiresInSeconds ?? 45
  const now = toDate(input.now ?? new Date())
  const expiresAt = new Date(now.getTime() + Math.max(1, expiresInSeconds) * 1000).toISOString()

  const payload: TokenPayload = {
    activityId: input.activityId,
    expiresAt,
  }

  const payloadPart = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(payloadPart, input.secret)

  return `${payloadPart}.${signature}`
}

export function verifyActivityScanToken(input: {
  token: string
  secret: string
  now?: DateLike
}): TokenPayload {
  const [payloadPart, signaturePart] = input.token.split('.')
  if (!payloadPart || !signaturePart) {
    throw new Error('Invalid token format')
  }

  const expectedSignature = signPayload(payloadPart, input.secret)
  const expectedBuffer = Buffer.from(expectedSignature)
  const receivedBuffer = Buffer.from(signaturePart)

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new Error('Invalid token signature')
  }

  let payload: TokenPayload
  try {
    payload = JSON.parse(fromBase64Url(payloadPart)) as TokenPayload
  } catch {
    throw new Error('Invalid token payload')
  }

  if (!payload.activityId || !payload.expiresAt) {
    throw new Error('Invalid token payload')
  }

  const now = toDate(input.now ?? new Date())
  const expiresAt = toDate(payload.expiresAt)

  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error('Invalid token payload')
  }

  if (now.getTime() > expiresAt.getTime()) {
    throw new Error('Token expired')
  }

  return payload
}
