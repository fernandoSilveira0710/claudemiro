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

export interface PixCustomer {
  name: string
  email: string
  taxId: string
  cellphone: string
}

// ─── PIX (Checkout Transparente) ──────────────────────────

export async function createPixPayment(
  amountInReais: number,
  description: string,
  customer: PixCustomer,
  expiresIn = 300,
) {
  const amountInCents = Math.round(amountInReais * 100)

  const data = await abacateFetch<TransparentData>('/transparents/create', {
    method: 'PIX',
    data: {
      amount: amountInCents,
      description,
      expiresIn,
      customer: {
        name: customer.name,
        email: customer.email,
        taxId: customer.taxId.replace(/\D/g, ''),
        cellphone: customer.cellphone.replace(/\D/g, ''),
      },
      metadata: { source: 'claudemiro' },
    },
  })

  return {
    paymentId: data.id,
    qrCode: data.brCode,
    qrCodeBase64: data.brCodeBase64,
    amount: data.amount,
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

/**
 * Simula o pagamento de um PIX em modo sandbox/devMode.
 * Em produção retorna erro.
 */
export async function simulatePixPayment(paymentId: string) {
  return abacateFetch<TransparentData>(`/transparents/simulate-payment?id=${paymentId}`, { metadata: {} })
}

/**
 * "Cancelar" um PIX QRCode — a AbacatePay não tem endpoint de cancelamento.
 * Só marcamos no nosso banco.
 */
export async function cancelPixPayment(_paymentId: string) {
  return true
}

// ─── Subscription (PRO) ────────────────────────────────────

interface SubscriptionData {
  id: string
  url: string
  status: string
}

export async function createProSubscription(customer: PixCustomer) {
  const data = await abacateFetch<SubscriptionData>('/subscriptions/create', {
    items: [
      {
        id: process.env.ABACATE_PAY_PRO_PRODUCT_ID || 'claudemiro-pro',
        quantity: 1,
      },
    ],
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/chat`,
    completionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    methods: ['CARD'],
    customer: {
      name: customer.name,
      email: customer.email,
      taxId: customer.taxId.replace(/\D/g, ''),
      cellphone: customer.cellphone.replace(/\D/g, ''),
    },
    metadata: { source: 'claudemiro', plan: 'PRO' },
  })

  return { initPoint: data.url, paymentId: data.id }
}

// ─── Webhook ───────────────────────────────────────────────

const ABACATEPAY_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

export function validateWebhookSignature(payload: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
  hmac.update(payload)
  const expected = hmac.digest('base64')
  const A = Buffer.from(expected)
  const B = Buffer.from(signature)
  return A.length === B.length && crypto.timingSafeEqual(A, B)
}
