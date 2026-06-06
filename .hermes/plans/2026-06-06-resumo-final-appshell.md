# Resumo Final + App Shell — Plano de Implementação

> **Para Hermes:** Implementar task por task, testando após cada uma.

**Meta:** Tela de resumo completa com card, compartilhamento, link de perfil; perfil público com paywall; app shell com tabs pós-veredito.

**Stack:** Next.js 16 + Supabase + Tailwind v4 + Framer Motion + AbacatePay

---

## Fluxo do Usuário

```
Chat → Veredito gerado → /resultado/[id]
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
              Card do veredito        Opções de share
              (VeredictCard)          • Copiar link
                    │                 • WhatsApp
                    ▼                 • Twitter/X  
              Link único:             • Download PNG
              /u/[username]                │
                    │                      ▼
              Usuário FREE?          [CTA "Liberar"]
              → tarja paywall              │
              Usuário PRO?            /planos
              → perfil completo
                    
Após 1º veredito → Home ganha tabs:
  [Início] [Perfil] [Configurações]
```

---

## Task 1: Refatorar `resultado/[id]` — Tela de Resumo Completa

**Objetivo:** Substituir a tela crua de 37 linhas por uma página rica com header, card, opções de compartilhamento e CTA.

**Arquivo:** `src/app/resultado/[id]/page.tsx`

**O que muda:**
- Header com ClaudemiroBot pequeno + "Seu Veredito" + botão voltar
- Card VeredictCard centralizado com animação
- Seção de compartilhamento: botões Copiar Link, WhatsApp, Twitter, Download PNG
- Link do perfil: `/u/{username}` com preview
- Se FREE: badge "Plano FREE — perfil com tarja"
- Se FLEX/PRO: badge "Perfil público liberado ✓"
- CTA inferior: "Fazer outro veredito" ou "Compartilhar"

**Dados necessários:**
- Veredito (já busca)
- Profile (plan, username) — adicionar join
- hasVeredictsBefore (saber se é primeiro)

**Novos componentes a criar:**
- `src/components/share-buttons.tsx` — botões de compartilhamento

---

## Task 2: Criar `ShareButtons` — Componente de Compartilhamento

**Objetivo:** Componente reutilizável com botões de share.

**Arquivo:** `src/components/share-buttons.tsx`

**Features:**
- Copiar link → `navigator.clipboard.writeText()` + toast "Link copiado!"
- WhatsApp → `https://wa.me/?text={url}`
- Twitter/X → `https://twitter.com/intent/tweet?text={text}&url={url}`
- Download PNG → html2canvas ou baixar card_image_url

**Props:**
```ts
{ url: string; text: string; cardImageUrl?: string }
```

---

## Task 3: Refatorar `/u/[username]` — Paywall para FREE

**Objetivo:** Perfil público mostra card completo só pra PRO/FLEX. FREE vê tarja + CTA.

**Arquivo:** `src/app/u/[username]/page.tsx`

**Lógica:**
```tsx
const isPaid = profile.plan === 'PRO' || profile.plan === 'FLEX'
const hasVeredict = latestVeredict !== null

if (!isPaid || !hasVeredict) {
  // Mostrar card com tarja blur + CTA "Liberar por R$3,99"
}
```

**Componentes:**
- Card com overlay blur + cadeado quando FREE
- Botão CTA → `/planos?return=/u/{username}`
- SEO metadata (og:image, title, description)

---

## Task 4: Criar Layout com Tabs (App Shell)

**Objetivo:** Layout com tabs inferiores: Início, Perfil, Configurações. Só aparece após primeiro veredito.

**Arquivos:**
- `src/components/app-tabs.tsx` — barra de tabs inferior
- Atualizar `src/app/layout.tsx` — condicional

**Tabs:**
```
┌─────────┬──────────┬───────────────┐
│  🏠     │  👤      │  ⚙️           │
│ Início  │ Perfil   │ Configurações │
└─────────┴──────────┴───────────────┘
```

**Lógica:**
- Verificar `vereditsCount > 0` pra mostrar tabs
- Rota atual destacada com cor primária
- Glassmorphism no fundo da tab bar

---

## Task 5: Criar Página de Perfil (logado)

**Objetivo:** `/perfil` — usuário vê seus próprios vereditos, card, dados conectados.

**Arquivo:** `src/app/perfil/page.tsx`

**Conteúdo:**
- Header com avatar + username + plano
- Card do último veredito (VeredictCard)
- Lista de vereditos anteriores (mini cards)
- Redes conectadas com ícones
- Link "Compartilhar perfil" → `/u/{username}`
- Botão "Novo veredito" → `/chat`

---

## Task 6: Criar Página de Configurações

**Objetivo:** `/configuracoes` — gerenciar conta, plano, redes.

**Arquivo:** `src/app/configuracoes/page.tsx`

**Conteúdo:**
- Seção Conta: email, nome, username
- Seção Plano: plano atual, upgrade/downgrade
- Seção Redes: gerenciar conexões (link pra /connect)
- Seção Perigo: logout, deletar conta
- Design: glass cards, mesma estética do projeto

---

## Task 7: Atualizar Home — Condicional Tabs + Redirecionamento

**Objetivo:** Depois do primeiro veredito, home ganha tabs. Antes disso, mantém dashboard atual.

**Arquivos:**
- `src/app/page.tsx` — adicionar verificação de vereditsCount
- `src/app/layout.tsx` — wrapper condicional com AppTabs

**Lógica:**
```tsx
{vereditsCount > 0 && <AppTabs currentPath={pathname} />}
```

---

## Ordem de Implementação

1. Task 2: ShareButtons (componente isolado, sem dependências)
2. Task 1: Resultado page (usa ShareButtons)
3. Task 3: Perfil público com paywall
4. Task 5: Perfil logado
5. Task 6: Configurações
6. Task 4: AppTabs
7. Task 7: Atualizar Home/Layout

---

## Pitfalls

- **Next.js 15 params são Promise** — `const { id } = await params`
- **Tailwind v4** — sem `@import url()` no CSS, usar `next/font/google`
- **Turbopack** — sub-rota dentro de rota pai causa 404
- **Meta refresh** pra OAuth callbacks, não `NextResponse.redirect()`
- **ClaudemiroBot SAGRADO** — sempre presente no header
