---
version: alpha
name: Claudemiro
description: Oráculo de personalidade digital — tom irreverente, cores vibrantes, estética teen/jovem adulto (15-35). Dark mode elétrico com neon accents, glassmorphism, tipografia bold.
colors:
  primary: "#A855F7"
  secondary: "#EC4899"
  tertiary: "#22D3EE"
  neutral: "#0D0221"
  surface: "#1A0A33"
  on-primary: "#FFFFFF"
  on-neutral: "#FFFFFF"
  on-surface: "#F3E8FF"
  muted: "#7C6B99"
  success: "#22C55E"
  danger: "#EF4444"
typography:
  h1:
    fontFamily: "DM Sans, sans-serif"
    fontSize: 3.5rem
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  h2:
    fontFamily: "DM Sans, sans-serif"
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h3:
    fontFamily: "DM Sans, sans-serif"
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.2
  body-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: 1.125rem
    lineHeight: 1.6
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 1rem
    lineHeight: 1.5
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: 0.875rem
    lineHeight: 1.4
  label-caps:
    fontFamily: "DM Sans, sans-serif"
    fontSize: 0.75rem
    fontWeight: 700
    letterSpacing: "0.1em"
    textTransform: uppercase
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
shadows:
  glow-primary: "0 0 30px rgba(168, 85, 247, 0.3)"
  glow-secondary: "0 0 30px rgba(236, 72, 153, 0.3)"
  glow-tertiary: "0 0 20px rgba(34, 211, 238, 0.2)"
  card: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: 14px 28px
    fontWeight: 800
  button-primary-hover:
    backgroundColor: "#9333EA"
    shadow: "{shadows.glow-primary}"
  button-secondary:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{colors.on-neutral}"
    rounded: "{rounded.lg}"
    borderColor: "rgba(255,255,255,0.1)"
  card:
    backgroundColor: "rgba(26, 10, 51, 0.6)"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    borderColor: "rgba(255,255,255,0.05)"
    shadow: "{shadows.card}"
    backdropFilter: "blur(20px)"
  input:
    backgroundColor: "rgba(255,255,255,0.03)"
    textColor: "{colors.on-neutral}"
    borderColor: "rgba(255,255,255,0.08)"
    rounded: "{rounded.md}"
    padding: 12px 16px
  badge:
    backgroundColor: "rgba(168, 85, 247, 0.15)"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 4px 12px
    fontWeight: 700
    fontSize: 0.75rem
---

## Overview

Claudemiro é um oráculo digital irreverente que analisa suas redes sociais e
entrega um veredito sobre quem você é. O design reflete seu tom: provocador,
divertido, e viciante. Dark mode com neon accents, glassmorphism, e tipografia
bold criam uma estética que remete a apps sociais (TikTok, Instagram, Spotify)
mas com identidade própria.

O fundo usa deep purple escuro (quase preto) como base, com gradientes vibrantes
e elementos com glow. Cards são translúcidos (glass effect). Botões têm
animação de scale e shadow glow no hover.

A vibe é: "oráculo futurista encontra zoeira de Twitter."

## Colors

- **Primary (#A855F7):** Roxo neon — ação principal, acentos, destaque
- **Secondary (#EC4899):** Pink elétrico — contraste, badges, interações
- **Tertiary (#22D3EE):** Cyan — links, informações, progresso
- **Neutral (#0D0221):** Deep dark purple — fundo principal
- **Surface (#1A0A33):** Purple escuro levemente mais claro — cards, superfícies
- **Muted (#7C6B99):** Texto secundário
- **Success (#22C55E):** Confirmação, conectado
- **Danger (#EF4444):** Erro, cancelar

## Typography

DM Sans para headlines e labels — bold, impactante, geométrica.
Inter para body — limpa, boa legibilidade em textos longos.

Hierarquia visual vem do peso e tamanho, não da família.

## Layout

Sistema de 4px. Usar `xl` (32px) entre seções, `lg` (24px) entre componentes,
`md` (16px) dentro de componentes. Sempre centralizado, max-width controlado.

## Shapes

Bordas generosamente arredondadas — `lg` (16px) como padrão, `xl` (24px)
em cards, `full` em badges. Isso suaviza o dark mode e deixa mais "friendly".

## Elevation & Depth

Usar glassmorphism em cards: `backdrop-filter: blur(20px)` com borda sutil
(`rgba(255,255,255,0.05)`). Sombras com glow colorido em elementos interativos.

## Components

- `button-primary`: Roxo sólido com texto branco bold. Hover: tom mais escuro
  com glow roxo. Principal CTA da página.
- `button-secondary`: Transparente com borda sutil. Para ações secundárias.
- `card`: Glass effect (translúcido + blur). Para agrupar conteúdo.
- `input`: Fundo sutil (3% branco), borda fina, foco com ring colorido.
- `badge`: Pill com fundo semi-transparente e texto colorido.

## Do's and Don'ts

- **Do** usar cores do token system via CSS custom properties.
- **Do** usar glassmorphism em cards, não fundos sólidos.
- **Do** animar interações com framer-motion (scale, opacity, spring).
- **Don't** usar cinza. Usar purple dark (#0D0221) como base.
- **Don't** usar sombras pretas. Usar glow colorido.
- **Don't** esquecer `prefers-reduced-motion`.
