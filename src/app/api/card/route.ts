import { createServerSupabase } from '@/lib/supabase/server'
import { generateImage } from '@/lib/nano-banana'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { veredictId, nanoBananaPrompt, profileImageUrl } = await request.json()

  if (!veredictId || !nanoBananaPrompt) {
    return NextResponse.json({ error: 'veredictId e nanoBananaPrompt são obrigatórios' }, { status: 400 })
  }

  // Gerar imagem via Nano Banana
  let imageUrl: string
  try {
    imageUrl = await generateImage(nanoBananaPrompt, profileImageUrl)
  } catch (err: any) {
    console.error('Nano Banana failed:', err)
    // Fallback: placeholder com cores do nicho
    const { data: veredict } = await supabase
      .from('veredits')
      .select('niche_colors')
      .eq('id', veredictId)
      .single()

    const primary = veredict?.niche_colors?.primary || '8B5CF6'
    imageUrl = `https://placehold.co/600x600/${primary.replace('#', '')}/FFFFFF?text=Claudemiro`
  }

  // Upload da imagem para Supabase Storage
  try {
    const imageRes = await fetch(imageUrl)
    const imageBlob = await imageRes.blob()

    const fileName = `cards/${user.id}/${veredictId}.png`
    const { error: uploadError } = await supabase.storage
      .from('cards')
      .upload(fileName, imageBlob, { contentType: 'image/png', upsert: true })

    if (uploadError) throw uploadError

    const { data: publicUrl } = supabase.storage
      .from('cards')
      .getPublicUrl(fileName)

    // Atualizar veredito com URL da imagem
    await supabase
      .from('veredits')
      .update({ card_image_url: publicUrl.publicUrl })
      .eq('id', veredictId)

    return NextResponse.json({ cardUrl: publicUrl.publicUrl })
  } catch (uploadErr: any) {
    console.error('Upload failed:', uploadErr)
    // Se upload falhar, usa URL direta
    await supabase
      .from('veredits')
      .update({ card_image_url: imageUrl })
      .eq('id', veredictId)

    return NextResponse.json({ cardUrl: imageUrl, warning: 'Usando URL direta, upload falhou' })
  }
}
