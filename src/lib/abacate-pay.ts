import crypto from 'crypto'

const ABACATE_API = 'https://api.abacatepay.com/v2'

function getToken() {
  const token = process.env.ABACATE_PAY_API_KEY
  if (!token) throw new Error('ABACATE_PAY_API_KEY not set')
  return token
}

async function abacateFetch<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${ABACATE_API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json()

  if (!json.success) {
    throw new Error(json.error || 'AbacatePay request failed')
  }

  return json.data as T
}

// ─── Types ────────────────────────────────────────────────

interface TransparentData {
  id: string
  brCode: string
  brCodeBase64: string
  status: string
  amount: number
}

// ─── PIX (Checkout Transparente) ──────────────────────────

/**
 * Gera PIX QR Code via Checkout Transparente.
 * Retorna brCode (copia-e-cola) e brCodeBase64 (imagem PNG).
 *
 * @param amountInReais - valor em reais (ex: 19.99)
 * @param description   - descrição da cobrança
 * @param customerEmail - email do pagador
 * @param expiresIn     - tempo de expiração em segundos (default: 1800 = 30min)
 */
export async function createPixPayment(
  amountInReais: number,
  description: string,
  customerEmail: string,
  expiresIn = 1800,
) {
  const amountInCents = Math.round(amountInReais * 100)

  // Nova API v2: method + data wrapper
  const data = await abacateFetch<TransparentData>('/transparents/create', {
    method: 'PIX',
    data: {
      amount: amountInCents,
      description,
      expiresIn,
      customer: {
        email: customerEmail,
      },
      metadata: {
        source: 'claudemiro',
      },
    },
  })

  return {
    paymentId: data.id,
    qrCode: data.brCode,
    qrCodeBase64: data.brCodeBase64,
  }
}

// ─── Status ────────────────────────────────────────────────

interface TransparentStatus {
  id: string
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'REFUNDED' | 'CANCELLED'
  expiresAt: string
}

export async function checkPaymentStatus(paymentId: string) {
  return abacateFetch<TransparentStatus>(`/transparents/check?id=${paymentId}`)
}

// ─── Subscription (PRO) ────────────────────────────────────

interface SubscriptionData {
  id: string
  url: string
  status: string
}

/**
 * Cria checkout de assinatura (PRO mensal).
 * Redireciona usuário para página hospedada da AbacatePay.
 *
 * Nova API: usa customerId (não customer inline),
 * methods: ["CARD"] para assinaturas.
 */
export async function createProSubscription(customerEmail: string) {
  const data = await abacateFetch<SubscriptionData>('/subscriptions/create', {
    items: [
      {
        id: process.env.ABACATE_PAY_PRO_PRODUCT_ID || 'claudemiro-pro',
        quantity: 1,
      },
    ],
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    completionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    methods: ['CARD'],
    metadata: {
      source: 'claudemiro',
      plan: 'PRO',
    },
  })

  return { initPoint: data.url, paymentId: data.id }
}

// ─── Webhook ───────────────────────────────────────────────

/**
 * Chave pública HMAC fornecida pela AbacatePay para validação de webhooks.
 * https://docs.abacatepay.com/pages/webhooks
 */
const ABACATEPAY_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

/**
 * Valida assinatura HMAC do webhook da AbacatePay.
 * Nova API v2: usa HMAC-SHA256 com digest base64 + chave pública.
 * Header: X-Webhook-Signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
): boolean {
  const hmac = crypto.createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
  hmac.update(payload)
  const expected = hmac.digest('base64')

  // timingSafeEqual para evitar timing attacks
  const A = Buffer.from(expected)
  const B = Buffer.from(signature)
  return A.length === B.length && crypto.timingSafeEqual(A, B)
}
