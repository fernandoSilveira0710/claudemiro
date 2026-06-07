import { createServerSupabase } from '@/lib/supabase/server'
import { generateCardImage } from '@/lib/gemini-image'
import { buildImagePrompt, type ImageBrief, type ImageStyle } from '@/lib/image-prompt-builder'
import { scanUserData } from '@/lib/scanner'
import { NextResponse } from 'next/server'

/**
 * Gera a imagem do card via Gemini 2.5 Flash Image.
 * - O estilo (engracado|casual|profissional) é o que a IA já decidiu no veredito.
 * - A fonte da imagem base:
 *     'generated' → sem referência (gera do zero)
 *     'network'   → usa avatar de uma rede conectada (precisa avatarUrl)
 *     'upload'    → usa upload do usuário (somente PRO; precisa avatarUrl)
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { veredictId, imageSource = 'generated', avatarUrl } = await request.json()
  if (!veredictId) {
    return NextResponse.json({ error: 'veredictId é obrigatório' }, { status: 400 })
  }

  // upload só PRO
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (imageSource === 'upload' && profile?.plan !== 'PRO') {
    return NextResponse.json({ error: 'Upload de foto é exclusivo do plano PRO.' }, { status: 402 })
  }

  // carrega veredito (brief + estilo decididos pela IA)
  const { data: veredict } = await supabase
    .from('veredits')
    .select('image_style, image_brief, niche_colors')
    .eq('id', veredictId)
    .single()

  if (!veredict) return NextResponse.json({ error: 'Veredito não encontrado' }, { status: 404 })

  const style: ImageStyle = (veredict.image_style as ImageStyle) || 'engracado'
  const brief: ImageBrief = (veredict.image_brief as ImageBrief) || {}

  const data = await scanUserData(user.id)
  const referenceImageUrl = imageSource === 'generated' ? undefined : avatarUrl

  const { prompt } = buildImagePrompt({
    data,
    brief,
    style,
    hasReferenceImage: !!referenceImageUrl,
  })

  // gera imagem (com fallback de placeholder se Gemini falhar)
  let base64: string | null = null
  try {
    const img = await generateCardImage(prompt, referenceImageUrl)
    base64 = img.base64
  } catch (err) {
    console.error('Gemini image failed:', err)
  }

  const fileName = `cards/${user.id}/${veredictId}.png`

  if (base64) {
    try {
      const buffer = Buffer.from(base64, 'base64')
      const { error: uploadError } = await supabase.storage
        .from('cards')
        .upload(fileName, buffer, { contentType: 'image/png', upsert: true })
      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage.from('cards').getPublicUrl(fileName)

      await supabase.from('veredits').update({
        card_image_url: publicUrl.publicUrl,
        image_source: imageSource,
        image_prompt: prompt,
      }).eq('id', veredictId)

      return NextResponse.json({ cardUrl: publicUrl.publicUrl, style })
    } catch (uploadErr) {
      console.error('Upload failed:', uploadErr)
    }
  }

  // fallback placeholder
  const primary = (veredict.niche_colors?.primary || '#8B5CF6').replace('#', '')
  const placeholder = `https://placehold.co/600x1066/${primary}/FFFFFF?text=Claudemiro`
  await supabase.from('veredits').update({
    card_image_url: placeholder,
    image_source: imageSource,
    image_prompt: prompt,
  }).eq('id', veredictId)

  return NextResponse.json({ cardUrl: placeholder, style, warning: 'Geração falhou, placeholder aplicado' })
}
