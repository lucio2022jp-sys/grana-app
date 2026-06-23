# 📋 PROGRESS — Pré-lançamento Grana

> Este arquivo é a fonte de verdade do que já foi feito e do que falta.
> Qualquer agente IA deve LER ESTE ARQUIVO antes de começar a trabalhar.
> E ATUALIZAR depois de cada entrega.

Última atualização: 2026-06-23

---

## 🎯 Objetivo da fase atual

Preparar o app pra **lançamento beta fechado** (50-100 Founders) e depois público.
Foco: **medir tudo, capturar leads, criar urgência real, suporte direto**.

Stack: Next.js 14 (App Router), Prisma + Postgres (Neon), Stripe, Vercel.
Domínio prod: https://grana-app-sigma.vercel.app/

---

## ✅ Já feito (entregue antes desta fase)

### Landing
- [x] Hero com CTAs, mockup, social proof estimado
- [x] Seção "Para quem" com 6 personas (manicure, motorista, freela, doceira, personal, cabelereira)
- [x] Trust badges no hero (criptografia, LGPD, Stripe)
- [x] Tipografia mobile ajustada
- [x] StickyCTA mobile (some perto do CTA final, fechável)
- [x] Footer com links institucionais
- [x] Páginas legais: /privacidade, /termos

### Produto
- [x] Auth com hash de senha + middleware
- [x] Stripe checkout + portal do cliente
- [x] Mailer (reset senha, emails genéricos via lib/mailer)
- [x] Rate limiting parcial (uploads, OCR notas)
- [x] 5 abas: Início, Tudo, Lançar, DAS, Perfil
- [x] DAS automático com cálculo, vencimento, multa, status
- [x] DASN-SIMEI com 2 números prontos pra colar + histórico
- [x] PWA registrado
- [x] Build limpo e em produção

---

## ✅ Fase 1 — CONCLUÍDA

| # | Item | Status | Notas |
|---|------|--------|-------|
| 1 | **Sentry instalado** | ✅ feito | @sentry/nextjs no package.json — falta só DSN no Vercel |
| 2 | **PostHog instalado** | ✅ feito | posthog-js + PostHogProvider no layout — falta key no Vercel |
| 3 | **Captura de lead (lista de espera)** | ✅ feito | Tabela Lead, /api/leads, LeadCapture renderizado entre FAQ e CTA final |
| 4 | **WhatsApp flutuante** | ✅ feito | WhatsAppFloat no layout — falta NEXT_PUBLIC_WHATSAPP_NUMBER no Vercel |
| 5 | ~~Plano Founder R$ 9,90~~ | ✅ descartado | Decisão: só trial 7 dias + Pro R$ 19,90 |
| 6 | **Banner urgência beta** | ✅ feito | BetaStripGate (esconde se logado/em rota privada) + card no #precos |
| 7 | **Verificar backup Postgres** | ✅ feito | docs/backup.md |

**Pendência operacional (não-código):** preencher no Vercel
- `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`

---

## 📅 Fase 2 — Antes de virar tráfego (próxima sessão)

- [x] Onboarding pós-signup (3-4 telas com tour) — WelcomeTour overlay no /app: 4 passos (painel, lancar, DAS, trial Pro). Mostra 1x via flag User.tourCompletedAt; endpoint POST /api/tour/complete idempotente.
- [x] Email automático D+1, D+3, D+6 do trial + email "trial acabou"
- [x] FAQ na landing — 11 perguntas cobrindo onboarding, contador, teto 81k, atraso DAS/DASN, seguranca, suporte e cancelamento. Ancora #faq.
- [ ] Seção "Como funciona em 3 passos" com screenshots reais
- [x] DAS de excedente (calcular DAS extra se passou de 81k) — calcularDASExcedente cobre tolerancia 20% e desenquadre retroativo; getMEIProjection retorna excedente real e projetado; home mostra dois cards
- [x] Notificações proativas DASN (15/jan, 1/maio, 25/maio) — runDasnReminders no cron diario, idempotente por ano-base, conversao BRT pra evitar perder marco quando cron atrasa em UTC. Banner in-app no dashboard ja existia.
- [x] Categorização de receita produto/serviço (acabar com 50/50 chute) — toggle no form, DASN usa por venda e cai no fallback da atividade

---

## 📅 Fase 3 — Pós-lançamento beta

- [ ] Programa de indicação (1 mês grátis por amigo)
- [ ] Parceria com contadores (30% comissão recorrente)
- [ ] SEO blog (DAS atrasado, limite 81k, etc)
- [ ] Conteúdo Insta/TikTok diário
- [ ] Dashboard admin pra acompanhar funil

---

## 🔑 Variáveis de ambiente necessárias

Adicionar no `.env` e no Vercel:

```
# Já existe
DATABASE_URL=
NEXTAUTH_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# A adicionar nesta fase
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_WHATSAPP_NUMBER=  # ex: 5547999999999
STRIPE_FOUNDER_PRICE_ID=      # criar no Stripe
```

---

## 📞 Dados que o usuário precisa fornecer

- [ ] Número de WhatsApp pra suporte (NEXT_PUBLIC_WHATSAPP_NUMBER)
- [ ] DSN do Sentry (criar projeto em sentry.io)
- [ ] Project key do PostHog (criar em posthog.com)
- [ ] Price ID do plano Founder (criar produto no Stripe)

Enquanto não chegam, fazemos com placeholder e config padrão.

---

## 🐛 Convenção de commits desta fase

```
feat(launch): <o que foi feito>
fix(launch): <bugfix>
chore(launch): <config>
```

Cada entrega da Fase 1 = 1 commit + push pra `main`.
PROGRESS.md atualizado em cada commit.

---

## 🔄 Como retomar a sessão se eu (IA) perder contexto

1. Ler este arquivo (PROGRESS.md)
2. `git log --oneline -20` pra ver commits recentes
3. Olhar a tabela "Fase 1" e ver o que tá 🟡 pendente
4. Continuar do próximo item
5. Sempre atualizar este arquivo no final da entrega
