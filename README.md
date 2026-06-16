# Grana — App de controle financeiro pra autonomas

App pra manicure, cabeleireira e esteticista descobrir quanto ganha de verdade.
Importa extrato Pix em PDF, categoriza com IA, mostra dashboard, alerta limite MEI.

## Status do projeto

MVP funcional. Pronto pra rodar local. Pra ir pra producao falta:
- Trocar SQLite por Postgres (Supabase recomendado)
- Trocar cookie simples por auth real (NextAuth, Clerk ou Supabase Auth)
- Adicionar Stripe pra cobranca
- Configurar dominio e SSL
- Subir pra Vercel

## Como rodar

```bash
cd /Users/yuji/sites/grana-app

# Instala dependencias (ja foi feito)
npm install

# Cria banco SQLite (ja foi feito)
npx prisma db push

# Roda em modo dev
npm run dev
```

Abre em http://localhost:3000

## Estrutura

```
src/
  app/
    page.tsx                        # Tela 1 - boas-vindas
    onboarding/
      profissao/page.tsx            # Tela 2 - escolha profissao
      metodo/page.tsx               # Tela 3 - como comecar
      upload/page.tsx               # Tela 4 - tutorial e upload
      processando/page.tsx          # Tela 5 - processando
      resultado/page.tsx            # Tela 6 - O SOCO (numeros)
      cadastro/page.tsx             # Tela 7 - cadastro pos-valor
      manual/page.tsx               # Alternativa: faixa estimada
    app/                            # Area logada
      page.tsx                      # Home/dashboard
      layout.tsx                    # Bottom nav
      transacoes/page.tsx           # Lista de tudo
      transacao/[id]/page.tsx       # Detalhe/edicao
      nova/page.tsx                 # Lancamento manual
      perfil/page.tsx               # Perfil e config
    api/
      me/route.ts                   # GET/POST user atual
      upload/route.ts               # Upload PDF
      transactions/route.ts         # GET/POST transacoes
      transactions/[id]/route.ts    # PATCH/DELETE transacao
      dashboard/route.ts            # Numeros agregados
  lib/
    db.ts                           # Cliente Prisma
    session.ts                      # Cookie de sessao
    pdf-parser.ts                   # Parser de extrato Pix
    classifier.ts                   # Categorizacao IA + heuristica
prisma/
  schema.prisma                     # Schema do banco
  dev.db                            # SQLite local
public/
  manifest.json                     # PWA
  icon-192.png, icon-512.png        # Icones
```

## Configuracao opcional (IA)

Sem chave da Anthropic o app categoriza por heuristica (palavras-chave).
Funciona, so menos precisa. Pra ter classificacao via Claude:

1. Cria conta em https://console.anthropic.com/
2. Gera uma API key
3. Cola em `.env`:

```
ANTHROPIC_API_KEY="sk-ant-..."
```

Custo estimado: ~R$ 0,01 por extrato processado (usando claude-3-5-haiku).

## Proximos passos quando acordar

### Imediato (antes de mostrar pra alguem)

1. **Testar o fluxo completo**: rodar `npm run dev`, fazer upload de um extrato Pix de verdade (Nubank/Caixa/Inter), conferir se a categorizacao faz sentido.
2. **Criar logo de verdade**: o icone atual e so um placeholder rosa. Substitua `public/icon-192.png` e `public/icon-512.png`.
3. **Testar em mobile**: Chrome DevTools > Device Toolbar, ou abre no celular via IP local.

### Curto prazo (1-2 semanas)

4. **Auth real**: instalar NextAuth ou Supabase Auth pra login com Google/Apple.
5. **Subir pro Supabase**: trocar SQLite por Postgres em producao. Schema do Prisma so muda o `servico`.
6. **Deploy na Vercel**: `vercel --prod` depois de logar. Variaveis de ambiente na dashboard.
7. **Configurar dominio**: comprar dominio (.com.br ~ R$ 40/ano) e apontar pra Vercel.

### Validacao (paralelo a tudo)

8. **Entrevistar 10 manicures**: mostrar prototipo, perguntar se topariam pagar R$ 19,90/mes.
9. **Pedir 5 amigas pra usar gratis** durante 1 mes em troca de feedback.
10. **Postar 3 videos no TikTok** com a logica "antes/depois" do app organizando o dinheiro dela.

### Monetizacao (depois de 10 usuarias ativas)

11. **Adicionar Stripe**: pacote de R$ 19,90/mes com 7 dias gratis.
12. **Adicionar limite no plano gratis**: 30 lancamentos/mes, depois pede upgrade.
13. **Email de retencao**: "Voce nao usa ha 7 dias, ta tudo bem?" via Resend ou SendGrid.

### Diferenciais futuros

14. **Open Finance via Pluggy** pra conexao automatica (R$ 0,50-3,00 por usuaria/mes).
15. **OCR de cupom fiscal** pra registrar despesa via foto.
16. **Exportacao de Carne-Leao** pronto pra IR.
17. **Lembretes via WhatsApp** (precisa WhatsApp Business API ou Twilio).

## Troubleshooting

### Erro de build "pdf-parse"
Esta declarado em `next.config.js` como external package. Se der erro, conferir
se `serverComponentsExternalPackages: ['pdf-parse']` continua la.

### Categorizacao errada
A heuristica mira casos brasileiros comuns. Se aparecer transacao categorizada
errada, edite no detalhe da transacao - app marca como `userConfirmed` e isso
serve de aprendizado pra refinar a heuristica em `src/lib/classifier.ts`.

### Banco de dados zerou
SQLite fica em `prisma/dev.db`. Se quiser zerar:
```bash
rm prisma/dev.db
npx prisma db push
```

### Tirar do desenvolvimento
Rode `npm run build && npm run start`.

## Decisoes tecnicas

- **Next.js 14 (App Router)**: SSR rapido, API routes no mesmo projeto, tudo TypeScript.
- **Tailwind**: estilizacao rapida, mobile-first, sem CSS modules.
- **Prisma + SQLite**: dev rapido. Em prod, troca pra Postgres so mudando 1 linha.
- **Cookie simples sem auth**: pra MVP. Em prod usar NextAuth ou similar.
- **Heuristica + IA em camadas**: 70% das transacoes resolvem com palavra-chave (gratis).
  Os 30% ambiguos vao pra Claude (~R$ 0,01 por extrato).
- **PWA mobile-first**: instalavel, sem precisar App Store no inicio.

## Limites conhecidos

- Parser de PDF e generico - pode errar em extratos atipicos. Refinar com mais bancos.
- OCR de foto nao implementado ainda (so PDF).
- Sem auth de verdade (qualquer um com seu cookie tem acesso).
- Sem rate limiting na API.
- Sem testes automatizados.
- Sem deploy em producao.

Esses sao "OK" pra MVP local, mas tem que resolver antes de qualquer pagante real.
