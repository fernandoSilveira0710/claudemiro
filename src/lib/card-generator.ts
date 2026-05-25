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
  "veredict_badge": "Tu é [rótulo de até 6 palavras, impactante, que a pessoa QUEIRA compartilhar]",
  "veredict_text": "[resumo de 2-3 parágrafos analisando a personalidade da pessoa com base nos dados reais, no tom do modo escolhido. Seja específico, cite dados reais que você viu nas redes dela]",
  "tags": [
    { "name": "Nome da tag", "emoji": "🔥", "percentage": 85 },
    { "name": "Nome da tag", "emoji": "🧠", "percentage": 70 },
    { "name": "Nome da tag", "emoji": "😈", "percentage": 60 },
    { "name": "Nome da tag", "emoji": "💪", "percentage": 45 },
    { "name": "Nome da tag", "emoji": "🎯", "percentage": 30 }
  ],
  "niche": "nerd|gamer|futebol|fitness|musica|otaku|politico|padrao|alternativo",
  "niche_colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex" },
  "profession_label": "[profissão no tom do modo, baseada no que você deduziu dos dados]",
  "political_stance": { "label": "Fez o L com força | Bolsominion assumido | Isentão master | Não quis falar", "percentage_lula": 60, "percentage_bolsonaro": 40 },
  "music_track": { "name": "Nome da música top", "artist": "Artista" },
  "tips": ["Dica 1 personalizada", "Dica 2 personalizada", "Dica 3 personalizada"],
  "nano_banana_prompt": "[Prompt detalhado em INGLÊS para gerar uma imagem cartoon/meme da pessoa. Descreva: aparência física baseada no avatar, estilo de roupa do nicho dela, 2-3 objetos relacionados aos gostos dela, fundo temático com as cores do nicho, estilo cartoon divertido/engraçado. Seja específico e visual. Ex: 'A cartoon portrait of a young brazilian woman with long dark hair, wearing a Valorant t-shirt and gaming headset, holding a energy drink, RGB lights in background, Steam logo glowing on the wall, anime posters, nerdy glasses, playful smirk, vibrant purple and green neon colors, meme style']"
}

Regras IMPORTANTES:
- veredict_badge: CURTO, IMPACTANTE, que a pessoa vai querer postar no Instagram. Ex: "Tu é Nerdola Raiz", "Cria do Mengão", "Kenga Premium", "Enzo dos Código"
- tags: 5 tags com nome, emoji e porcentagem. As porcentagens DEVEM ser baseadas nos dados reais.
- niche: identifique o gênero/nicho DOMINANTE da pessoa
- niche_colors: cores que representem o nicho (nerd=roxo/verde neon, futebol=verde/amarelo ou cores do time, otaku=rosa/ciano, fitness=preto/laranja, música=violeta/rosa)
- nano_banana_prompt: prompt em inglês bem detalhado pra IA de imagem, MÍNIMO 100 caracteres
- NÃO invente dados que não existem. Se não tem música, não coloque música. Se não tem posição política, coloque "Não detectado".
- Responda APENAS o JSON, sem texto antes ou depois.`
}
