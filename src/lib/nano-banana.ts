const NANO_BANANA_API = process.env.NANO_BANANA_API_URL || 'https://nano-banana.com/api/generate'

export async function generateImage(prompt: string, referenceImageUrl?: string): Promise<string> {
  const body: Record<string, any> = { prompt }

  if (referenceImageUrl) {
    body.reference_image = referenceImageUrl
  }

  const res = await fetch(NANO_BANANA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NANO_BANANA_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Nano Banana error:', res.status, err)
    throw new Error(`Nano Banana API error: ${res.status}`)
  }

  const data = await res.json()
  return data.image_url || data.url || data.output
}
