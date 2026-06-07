import type { ScannedUserData } from './scanner'

/**
 * Constrói o prompt visual do avatar do card de forma DIRIGIDA POR REGRAS.
 *
 * A IA do veredito ainda decide o estilo (engracado | casual | profissional)
 * e fornece um `imageBrief` com as características-chave detectadas. Aqui nós
 * traduzimos esse brief + os dados brutos das redes em instruções visuais
 * concretas (camiseta, braços, boné, expressão, elementos extras), garantindo
 * consistência mesmo quando o modelo de texto é fraco (Gemma/Qwen no FREE/FLEX).
 */

export type ImageStyle = 'engracado' | 'casual' | 'profissional'

export interface ImageBrief {
  // vindos do veredito (a IA preenche o que conseguir)
  gym_level?: 'none' | 'light' | 'heavy'        // academia: pouco vs marombeiro
  gym_serious?: boolean                          // leva a sério ou é zoeira
  beach?: boolean                                // curte praia
  football_team?: string | null                 // ex: "Flamengo"
  religion_formal?: boolean                      // visual mais formal (camisa)
  skater?: boolean
  rocker?: boolean
  nerd?: boolean                                 // dev / tech / games
  profession?: string | null                    // ex: "programador", "contador"
  fandoms?: string[]                             // ex: ["Dragon Ball", "BTS"]
  pet?: string | null                            // ex: "gato", "cachorro"
  extra_props?: string[]                         // dicas livres da IA
}

const STYLE_DIRECTIVE: Record<ImageStyle, string> = {
  engracado:
    'Exaggerated cartoon / caricature style, big expressive head, comedic vibe, playful meme energy. Bold outlines, vibrant flat colors.',
  casual:
    'Friendly semi-stylized illustration that clearly resembles the real person, natural proportions with a slightly stylized finish, relaxed expression.',
  profissional:
    'Clean, polished, near-realistic portrait. Minimal extra elements. Composed and confident expression. Subtle, tasteful styling.',
}

/** Pega o artista da melhor música do Spotify (para estampar em camiseta/boné/tattoo). */
function topMusicReference(data: ScannedUserData): string | null {
  const artist = data.spotify?.topArtists?.[0]?.name
  const trackArtist = data.spotify?.topTracks?.[0]?.artist
  return artist || trackArtist || null
}

/** Jogo com mais horas no Steam vira estampa/elemento nerd. */
function topGameReference(data: ScannedUserData): string | null {
  const games = data.steam?.games
  if (!games?.length) return null
  const top = [...games].sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))[0]
  return top?.name || null
}

function buildTorso(brief: ImageBrief, music: string | null): string {
  // ordem de prioridade do "torso": religião formal > sem camisa (praia) > regata (maromba) > camisa de time > camiseta temática
  if (brief.religion_formal) return 'wearing a neat buttoned dress shirt, tidy and conservative look'
  if (brief.beach) return 'shirtless or in an open beach shirt, holding a surfboard, sunny beach mood'
  if (brief.gym_level === 'heavy' && brief.gym_serious) return 'wearing a gym tank top showing a muscular, well-built physique'
  if (brief.football_team) return `wearing the official ${brief.football_team} football jersey`

  // camiseta temática por fandom / música / nerd
  const fandom = brief.fandoms?.[0]
  if (fandom) return `wearing a graphic t-shirt featuring ${fandom}`
  if (brief.nerd) return 'wearing a t-shirt with a computer / code print, nerdy aesthetic'
  if (music) return `wearing a band t-shirt referencing ${music}`
  return 'wearing a casual t-shirt'
}

function buildArms(brief: ImageBrief, music: string | null): string {
  const parts: string[] = []
  if (brief.gym_level === 'heavy') {
    parts.push(brief.gym_serious ? 'noticeably muscular arms' : 'slightly toned arms drawn in a funny "trying hard" way')
  } else if (brief.gym_level === 'light') {
    parts.push('average, lightly toned arms')
  }
  if (music && brief.rocker) parts.push(`a tattoo on the forearm referencing ${music}`)
  if (brief.profession === 'programador' || brief.nerd) parts.push('a smartwatch on the wrist')
  return parts.length ? parts.join(', ') : 'relaxed arms'
}

function buildHat(brief: ImageBrief): string | null {
  if (brief.skater) return 'wearing a cap turned backwards, skater style'
  // boné entra quando há "muitas características" — usamos número de fandoms/props como proxy
  const richness = (brief.fandoms?.length || 0) + (brief.extra_props?.length || 0)
  if (richness >= 2) return 'wearing a cap with a small logo badge'
  return null
}

function buildFace(brief: ImageBrief, style: ImageStyle): string {
  if (brief.rocker) return 'making the rock "horns" hand sign, tongue out, intense eyes'
  if (style === 'engracado') return 'goofy comedic facial expression, exaggerated smirk'
  if (style === 'profissional') return 'serious, composed, confident expression'
  return 'relaxed, friendly natural expression'
}

function buildExtraProps(brief: ImageBrief, data: ScannedUserData): string[] {
  const props: string[] = []
  const game = topGameReference(data)

  if (brief.profession === 'programador' || brief.nerd) props.push('a "Java" branded coffee mug nearby, a keyboard tucked under the arm')
  if (brief.profession === 'contador') props.push('a pen tucked behind the ear')
  if (game && brief.nerd) props.push(`a subtle ${game} reference (poster or item)`)
  if (brief.pet) props.push(`a small ${brief.pet} companion beside the character`)
  if (brief.extra_props?.length) props.push(...brief.extra_props)

  return props
}

export interface BuiltImagePrompt {
  prompt: string
  style: ImageStyle
  usedReferenceImage: boolean
}

/**
 * Monta o prompt final para o Gemini 2.5 Flash Image.
 * Se `referenceImageUrl` existir (foto de perfil / upload), a IA edita a foto
 * mantendo o rosto; senão gera do zero com base no brief.
 */
export function buildImagePrompt(opts: {
  data: ScannedUserData
  brief: ImageBrief
  style: ImageStyle
  hasReferenceImage: boolean
}): BuiltImagePrompt {
  const { data, brief, style, hasReferenceImage } = opts
  const music = topMusicReference(data)

  const torso = buildTorso(brief, music)
  const arms = buildArms(brief, music)
  const hat = buildHat(brief)
  const face = buildFace(brief, style)
  const extras = buildExtraProps(brief, data)

  const subject = hasReferenceImage
    ? 'Recreate the person from the provided reference photo, keeping their recognizable face and hairstyle, but redraw them facing forward (front-facing portrait).'
    : 'A front-facing portrait of a young Brazilian person.'

  const bodyLines = [
    subject,
    STYLE_DIRECTIVE[style],
    `Outfit: ${torso}.`,
    `Arms: ${arms}.`,
    hat ? `Headwear: ${hat}.` : '',
    `Face: ${face}.`,
    extras.length ? `Extra elements: ${extras.join('; ')}.` : '',
    'IMPORTANT: fully transparent background (PNG alpha), no scenery — only the character, so it can be composited inside a trading card.',
    'Vertical 9:16 framing, character centered, head and torso visible.',
  ].filter(Boolean)

  return {
    prompt: bodyLines.join('\n'),
    style,
    usedReferenceImage: hasReferenceImage,
  }
}
