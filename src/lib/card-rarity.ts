// Sistema de raridade das cartas — igual Pokémon TCG
// FREE: comum/incomum, 10% chance de Reverse Holo
// FLEX: raras, galaxy, rainbow, gold, radiant

export type CardRarity =
  | 'COMMON'       // só glare 3D
  | 'UNCOMMON'     // glare + shine sutil
  | 'REVERSE_HOLO' // foil + mask (lendária free)
  | 'RARE_HOLO'    // barras holográficas
  | 'GALAXY'       // cosmos/galaxy
  | 'RAINBOW'      // glitter arco-íris
  | 'GOLD'         // dourado secreto
  | 'RADIANT'      // padrão cruzado

export interface RarityInfo {
  id: CardRarity
  label: string
  emoji: string
  tier: 'free' | 'flex'
}

export const RARITIES: Record<CardRarity, RarityInfo> = {
  COMMON:       { id: 'COMMON',       label: 'Comum',        emoji: '⬜', tier: 'free' },
  UNCOMMON:     { id: 'UNCOMMON',     label: 'Incomum',      emoji: '🟦', tier: 'free' },
  REVERSE_HOLO: { id: 'REVERSE_HOLO', label: 'Reverse Holo', emoji: '💿', tier: 'free' },
  RARE_HOLO:    { id: 'RARE_HOLO',    label: 'Rara Holo',    emoji: '✨', tier: 'flex' },
  GALAXY:       { id: 'GALAXY',       label: 'Galáxia',      emoji: '🌌', tier: 'flex' },
  RAINBOW:      { id: 'RAINBOW',      label: 'Arco-Íris',    emoji: '🌈', tier: 'flex' },
  GOLD:         { id: 'GOLD',         label: 'Ouro Secreto', emoji: '🥇', tier: 'flex' },
  RADIANT:      { id: 'RADIANT',      label: 'Radiante',     emoji: '💫', tier: 'flex' },
}

/** Gera raridade determinística baseada no ID do veredict (seed fixo = mesma raridade sempre) */
export function rollRarity(plan: 'FREE' | 'FLEX' | 'PRO', seed?: string): CardRarity {
  // Se tem seed (ID do veredict), usa hash determinístico
  let r: number
  if (seed) {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i)
      hash |= 0
    }
    r = Math.abs(hash) / 2147483648
  } else {
    r = Math.random()
  }

  if (plan === 'FREE') {
    // 10% chance de pegar Reverse Holo (lendária free)
    if (r < 0.10) return 'REVERSE_HOLO'
    if (r < 0.55) return 'COMMON'
    return 'UNCOMMON'
  }

  // FLEX / PRO: sempre raras
  if (r < 0.25) return 'RARE_HOLO'
  if (r < 0.50) return 'GALAXY'
  if (r < 0.70) return 'RAINBOW'
  if (r < 0.85) return 'GOLD'
  return 'RADIANT'
}
