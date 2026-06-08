/**
 * Cliente do Gemini 2.5 Flash Image ("Nano Banana").
 * Gera a imagem do avatar do card. Aceita uma imagem de referência opcional
 * (foto de perfil de rede ou upload PRO) para edição mantendo o rosto.
 *
 * Contrato REST:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent
 *   header: x-goog-api-key
 *   resposta: candidates[0].content.parts[].inlineData.data  (base64 PNG)
 */

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`

export interface GeminiImageResult {
  /** PNG cru em base64 (sem prefixo data:) */
  base64: string
  mimeType: string
}

async function fetchAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Claudemiro/1.0' } })
  if (!res.ok) throw new Error(`Falha ao baixar imagem de referência: ${res.status}`)
  const mimeType = res.headers.get('content-type') || 'image/jpeg'
  const buf = Buffer.from(await res.arrayBuffer())
  return { data: buf.toString('base64'), mimeType }
}

export async function generateCardImage(
  prompt: string,
  referenceImageUrl?: string,
): Promise<GeminiImageResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada')

  const parts: Array<Record<string, unknown>> = [{ text: prompt }]

  if (referenceImageUrl) {
    const { data, mimeType } = await fetchAsBase64(referenceImageUrl)
    parts.push({ inline_data: { mime_type: mimeType, data } })
  }

  const res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '9:16' },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Gemini image error:', res.status, err)
    throw new Error(`Gemini Image API error: ${res.status} — ${err.slice(0, 300)}`)
  }

  const data = await res.json()
  const partsOut: Array<Record<string, unknown>> = data?.candidates?.[0]?.content?.parts || []
  const imgPart = partsOut.find((p) => p.inlineData || p.inline_data) as Record<string, { data?: string; mimeType?: string; mime_type?: string }> | undefined
  const inline = imgPart?.inlineData || imgPart?.inline_data

  if (!inline?.data) {
    throw new Error('Gemini não retornou imagem (possível bloqueio de safety).')
  }

  return { base64: inline.data, mimeType: inline.mimeType || inline.mime_type || 'image/png' }
}
