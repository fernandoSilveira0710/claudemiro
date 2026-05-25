import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})

export async function createPixPayment(amount: number, description: string, userEmail: string) {
  const payment = new Payment(client)

  const result = await payment.create({
    body: {
      transaction_amount: amount,
      description,
      payment_method_id: 'pix',
      payer: { email: userEmail },
    },
  })

  return {
    qrCode: result.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
    paymentId: result.id,
  }
}

export async function createProSubscription(userEmail: string) {
  const preference = new Preference(client)

  const result = await preference.create({
    body: {
      items: [
        {
          id: 'pro-monthly',
          title: 'Claudemiro PRO',
          description: 'Vereditos ilimitados + página pública + desafios semanais',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: 9.9,
        },
      ],
      payer: { email: userEmail },
      auto_return: 'approved',
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failure`,
      },
    },
  })

  return { initPoint: result.init_point, preferenceId: result.id }
}
