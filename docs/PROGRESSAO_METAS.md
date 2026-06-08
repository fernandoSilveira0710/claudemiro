# Progressão & Metas — O que é verificável por API

> Princípio: **uma meta só existe se uma API confirma o cumprimento.**
> "Caminhe 2h" é inverificável. "Jogue +2h de X no Steam" é verificável (`playtime_forever`).
> Toda meta abaixo tem uma métrica numérica que comparamos entre o veredito anterior e o atual.

---

## 1. Fontes que JÁ temos e o que cada uma mede

### Steam (OAuth/Web API) — `raw_data: { profile, games[] }`
Campos: `games[].name`, `games[].playtime_forever` (min), `games[].playtime_2weeks` (min).
**Verificável:**
- Horas totais jogadas (soma de `playtime_forever`)
- Horas em um jogo específico (delta de `playtime_forever` daquele appid)
- Horas nas últimas 2 semanas (`playtime_2weeks`) — ótimo pro cooldown de 5 dias
- Número de jogos na biblioteca

**Metas possíveis:** "Jogue +2h de {top game}", "Jogue +5h no total", "Adicione um jogo novo à lista".

### Spotify (OAuth) — scopes `user-top-read user-read-recently-played`
**Hoje usamos só `top/artists` e `top/tracks` (medium_term = ~6 meses).**
Doc: `time_range` = short_term (~4 semanas) | medium_term (~6 meses) | long_term (~1 ano).
**Verificável:**
- Top artistas/músicas em `short_term` — muda em ~4 semanas (cooldown de 5 dias é curto, mas dá pra captar entrada de artista novo)
- `GET /me/player/recently-played` (até 50 faixas, com timestamp) — **JÁ pedimos o scope mas NÃO usamos!**
  Isso permite verificar: "ouviu música do artista X recentemente", "ouviu N faixas de um gênero".
- `popularity` (0-100) de cada track, `genres` de cada artista

**Metas possíveis:** "Ouça 3 músicas do {artista} esta semana" (via recently-played), "Descubra um artista de {gênero} novo no seu top", "Saia da bolha: ouça um gênero diferente".

### YouTube (OAuth) — scope `youtube.readonly`
**Verificável (YouTube Data API v3):**
- `channels.list (mine, part=statistics)`: `subscriberCount`, `videoCount`, `viewCount`
- `subscriptions.list (mine)`: lista de canais inscritos (contagem, novos canais)
- `playlistItems` da playlist "Liked Videos" (se acessível): vídeos curtidos
**Metas possíveis:** "Inscreva-se em +3 canais", "Curta +10 vídeos", (se criador) "Poste 1 vídeo novo".

### Discord (OAuth) — scope `identify guilds`
**Verificável:** número de servidores (`guilds.length`), nomes dos servidores.
**Metas possíveis:** "Entre em +2 servidores novos". (limitado — Discord não expõe mensagens/horas)

### Instagram (scraper ScrapeCreators) — `{ followers, following, posts }`
**Verificável:** followers, following, posts (media_count).
**Metas possíveis:** "Poste +3 fotos", "Ganhe +10 seguidores", "Siga menos gente (detox): -5 following".

### X/Twitter (scraper) — `{ followers, following, tweets }`
**Verificável:** followers, following, tweets (statuses_count).
**Metas:** "Tuíte +5 vezes", "Ganhe +5 seguidores".

### TikTok (scraper) — `{ followers, following, videos }`
**Metas:** "Poste +1 vídeo", "Ganhe +20 seguidores".

### GitHub (API pública) — `{ followers, public_repos? }`
**Verificável:** followers, public_repos, (via events API) commits recentes.
**Metas:** "Crie +1 repositório público", "Ganhe +2 followers no GitHub".

### Reddit (API pública) — `{ total_karma, link_karma, comment_karma }`
**Metas:** "Ganhe +50 de karma", "Poste algo (link_karma sobe)".

### LinkedIn (scraper) — `{ followers/connections }`
**Metas:** "Ganhe +10 conexões".

---

## 2. Tópicos SEM fonte de dado (o gap que você apontou)

Estes aparecem no chat mas **não têm API que verifique** → não podem virar meta mensurável
hoje. Opções para cada um:

| Tópico | Tem API? | Como tornar verificável |
|--------|----------|--------------------------|
| Caminhada / corrida | ❌ | Integrar **Strava** (OAuth) ou **Google Fit / Apple Health** → distância, tempo, atividades |
| Vida fitness / academia | ❌ | Strava, ou apps tipo Fitbit/Garmin (OAuth). Sem isso, só declarativo (não vira meta) |
| Leitura de livros | ❌ | Integrar **Goodreads** (API descontinuada) ou **Hardcover/StoryGraph** → livros lidos no ano |
| Filmes/Séries | parcial | Integrar **Trakt** ou **Letterboxd (scraper)** → filmes assistidos, watchlist |
| Futebol (assistir jogos) | ❌ | Sem API de "assisti tal jogo". Só declarativo. |

**Conclusão honesta:** caminhada, fitness e leitura **não viram meta verificável** sem uma
nova integração. Duas saídas:
1. **Integrar Strava** (fitness/caminhada/corrida — OAuth, distância/tempo reais) e
   **Trakt** (filmes/séries — OAuth) e um tracker de leitura.
2. **Metas declarativas honestas:** marcadas como "no honra" (sem verificação), visualmente
   diferentes das verificadas — risco de o usuário "marcar cumprido" sem fazer.

Recomendação: priorizar **Strava** (cobre caminhada+corrida+fitness de uma vez) e usar o
`recently-played` do Spotify (já temos o scope) pra metas musicais reais.

---

## 3. STATUS — implementado

✅ Strava (OAuth `read,activity:read`) → `athletes/{id}/stats` recent/ytd totals
✅ Trakt (OAuth) → `users/me/stats` filmes/episódios/séries
✅ Spotify recently-played (scope já existia) → metas musicais reais por artista/gênero
✅ Tópicos novos no chat: `leitura` 📚, `saude` 🏃 (corrida/caminhada)
✅ Métricas e metas verificáveis pra todas as plataformas em `progression.ts`

### Variáveis de ambiente novas necessárias
- `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`
- `TRAKT_CLIENT_ID`, `TRAKT_CLIENT_SECRET`

## 4. Metas verificáveis ativas

Todas comparam `metrics` do veredito anterior com o atual:

- Steam: `+Xh em {top_game}`, `+Xh total`, `+1 jogo novo`
- Spotify (recently-played): `ouça {artista} N vezes`, `ouça um gênero novo`
- Spotify (top short_term): `{artista} entrou no seu top`
- Instagram: `+N posts`, `+N seguidores`
- X: `+N tweets`
- TikTok: `+N vídeos`
- YouTube: `+N inscrições`, `+N vídeos curtidos`
- GitHub: `+N repos`, `+N followers`
- Reddit: `+N karma`
- Discord: `+N servidores`
