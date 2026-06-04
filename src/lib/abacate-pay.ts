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

  const data = await abacateFetch<TransparentData>('/transparents/create', {
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
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'REFUNDED' | 'DISPUTED'
  amount: number
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
 */
export async function createProSubscription(customerEmail: string) {
  const data = await abacateFetch<SubscriptionData>('/subscriptions/create', {
    items: [
      {
        id: process.env.ABACATE_PAY_PRO_PRODUCT_ID || 'claudemiro-pro',
        quantity: 1,
      },
    ],
    customer: { email: customerEmail },
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    completionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    metadata: {
      source: 'claudemiro',
      plan: 'PRO',
    },
  })

  return { initPoint: data.url, paymentId: data.id }
}

// ─── Webhook ───────────────────────────────────────────────

/**
 * Valida assinatura HMAC do webhook da AbacatePay.
 * Usada pelo webhook handler diretamente.
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expected = hmac.digest('hex')
  return expected === signature
}
