import { ScannedUserData } from './scanner'

export function buildVeredictPrompt(
  userData: ScannedUserData,
  chatHistory: { role: string; content: string }[],
  mode: string
): string {
  const toneGuide = mode === 'engracado'
    ? 'Humor ácido, gírias brasileiras, zoeira. OnlyFans = "Kenga", Dev = "Faz programa", Gamer = "Nerdola", Otaku = "Otaku fedido", Fitness = "Marombeiro de frango", Político = "Lambe-botas"'
    : mode === 'profissional'
    ? 'Tom sério e analítico. Sem gírias, sem apelidos. Linguagem formal mas acessível.'
    : 'Tom leve, gírias suaves. OnlyFans = "Criadora de conteúdo", Dev = "Dev", Gamer = "Gamer".'

  return `Você é o Claudemiro, um oráculo de personalidade digital. Analise os dados abaixo e gere um veredito completo.

MODO: ${mode}
GUIA DE TOM: ${toneGuide}

DADOS DAS REDES SOCIAIS:
${JSON.stringify(userData, null, 2)}

HISTÓRICO DO CHAT COM O USUÁRIO:
${JSON.stringify(chatHistory, null, 2)}

Baseado nesses dados, gere um JSON com esta estrutura exata:
{
  "main_trait": "[UMA ÚNICA PALAVRA ou apelido curto (máx 2 palavras). NÃO use frases. Ex: 'Nerdão', 'Palmeirense', 'Javeiro', 'Lolzeiro', 'Marombeiro', 'Crente', 'Sertanejo', 'Otaku', 'Low-profile']",
  "summary_emoji": "[UM único emoji que RESUME a pessoa. Ex: 🎮 gamer, 🙏 religioso, ⚽ futebol, 🎸 rockeiro, 📚 nerd, 🏋️ academia]",
  "veredict_badge": "[UMA PALAVRA curta e impactante. Ex: 'Nerdola', 'Cria', 'Javeiro', 'Palmeirense', 'Sertanejo']",
  "veredict_text": "[resumo de 2-3 parágrafos analisando a personalidade da pessoa com base nos dados reais, no tom do modo escolhido. Seja específico, cite dados reais que você viu nas redes dela]",
  "overall": "[nota FIFA de 40 a 99 representando o quão 'completa' a pessoa é — 99 = lenda viva, 90+ = elite, 80+ = muito bom, 70+ = bom, 60+ = ok, 50+ = abaixo da média, 40-49 = precisa melhorar]",
  "skills": [
    { "name": "[NOME CURTO, 1-2 palavras máx. Ex: 'Lethal Company', 'Palmeiras', 'Dev', 'Social', 'Academia', 'Sertanejo']", "emoji": "[emoji coerente, NUNCA use 😈]", "value": 87 },
    { "name": "Nome curto", "emoji": "[emoji coerente]", "value": 70 },
    { "name": "Nome curto", "emoji": "[emoji coerente]", "value": 60 },
    { "name": "Nome curto", "emoji": "[emoji coerente]", "value": 45 },
    { "name": "Nome curto", "emoji": "[emoji coerente]", "value": 30 }
  ],
  "hashtags": ["#nerdola", "#antisocial", "#rockeiro"],
  "summary_short": "[frase ÚNICA e concisa que resume a pessoa no tom do modo. Máximo 30 palavras]",
  "personal_map": [
    { "axis": "Games", "value": 87, "comment": "[comentário curto no tom]"},
    { "axis": "Código", "value": 71, "comment": "[...]" },
    { "axis": "Música", "value": 82, "comment": "[...]" },
    { "axis": "Futebol", "value": 95, "comment": "[...]" },
    { "axis": "Social", "value": 43, "comment": "[...]" }
  ],
  "tags": [
    { "name": "Nome da tag", "emoji": "🔥", "percentage": 85 },
    { "name": "Nome da tag", "emoji": "🧠", "percentage": 70 },
    { "name": "Nome da tag", "emoji": "😈", "percentage": 60 },
    { "name": "Nome da tag", "emoji": "💪", "percentage": 45 },
    { "name": "Nome da tag", "emoji": "🎯", "percentage": 30 }
  ],
  "image_style": "engracado|casual|profissional",
  "image_brief": {
    "gym_level": "none|light|heavy",
    "gym_serious": true,
    "beach": false,
    "football_team": "Flamengo",
    "religion_formal": false,
    "skater": false,
    "rocker": true,
    "nerd": true,
    "profession": "programador",
    "fandoms": ["Dragon Ball"],
    "pet": "gato",
    "extra_props": ["café na mesa", "adesivo da Steam no notebook"]
  },
  "niche": "nerd|gamer|futebol|fitness|musica|otaku|politico|padrao|alternativo",
  "niche_colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex" },
  "profession_label": "[profissão no tom do modo, baseada no que você deduziu dos dados]",
  "political_stance": { "label": "Fez o L com força | Bolsominion assumido | Isentão master | Não quis falar", "percentage_lula": 60, "percentage_bolsonaro": 40 },
  "music_track": { "name": "Nome da música top", "artist": "Artista" },
  "tips": ["Dica 1 personalizada", "Dica 2 personalizada", "Dica 3 personalizada"],
  "user_name": "[primeiro nome real da pessoa se aparecer nos dados das redes (display name, username), senão null]",
  "final_opinion": "[a OPINIÃO FINAL do Claudemiro no tom do modo — 1 a 2 frases diretas pra pessoa, juntando tudo. Ex modo engraçado: 'Sai do buraco, Fernando. Larga o Lethal Company, começa a postar, e para de sofrer torcendo pro Palmeiras perder em casa.' Deve ser pessoal, usar o nome se souber, e soar como um conselho/zoeira de amigo]",
  "network_highlights": [
    { "platform": "youtube", "icon": "📺", "label": "Canal favorito", "value": "[canal mais relevante que segue, ou vídeo/categoria]" },
    { "platform": "spotify", "icon": "🎵", "label": "Som que define", "value": "[artista ou música top]" },
    { "platform": "steam", "icon": "🎮", "label": "Vício do momento", "value": "[jogo com mais horas]" },
    { "platform": "futebol", "icon": "⚽", "label": "Coração", "value": "[time que torce, se souber]" },
    { "platform": "discord", "icon": "💬", "label": "Refúgio", "value": "[servidor/atividade no Discord]" }
  ]
}

Regras IMPORTANTES:
- main_trait: CURTO (1 palavra ou apelido de 2 palavras). NADA de frases. Ex: "Nerdão", "Palmeirense", "Javeiro", "Crente"
- veredict_badge: CURTO também (1-2 palavras). Ex: "Nerdola", "Cria do Verdão", "Javeiro Raiz"
- overall: nota FIFA de 40 a 99. Seja sincero! Pouca gente merece 99.
- skills: 5 skills com nome CURTO (1-2 palavras), emoji coerente e valor (0-100). Os valores DEVEM ser baseados nos dados reais. NUNCA use emoji 😈.
- hashtags: 3-5 hashtags estilo Instagram com #, no tom do modo
- summary_short: UMA frase só, impactante, que capture a essência
- personal_map: 5 eixos com nomes LEGÍVEIS, valor 0-100 e comentário curto. Os eixos DEVEM refletir os dados reais.
- image_style: o estilo visual do personagem (engracado = cartoon exagerado, casual = semi-stylized amigável, profissional = limpo e polido)
- image_brief: características físicas e visuais detectadas. ESSENCIAL para gerar a imagem depois. Seja preciso.
- tags: 5 tags com nome, emoji e porcentagem. As porcentagens DEVEM ser baseadas nos dados reais.
- niche: identifique o gênero/nicho DOMINANTE da pessoa
- niche_colors: cores que representem o nicho (nerd=roxo/verde neon, futebol=verde/amarelo ou cores do time, otaku=rosa/ciano, fitness=preto/laranja, música=violeta/rosa)
- final_opinion: a cereja do bolo. Junte TUDO num conselho/zoeira final no tom do modo. Use o nome se souber. Seja memorável.
- network_highlights: SÓ inclua redes que a pessoa realmente tem dados. Remova as que não tiver. value sempre baseado em dado real.
- user_name: extraia o primeiro nome real dos dados. Se só tiver @username genérico, deixe null.
- NÃO invente dados que não existem. Se não tem música, não coloque música. Se não tem posição política, coloque "Não detectado".
- Responda APENAS o JSON, sem texto antes ou depois.`
}
