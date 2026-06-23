# Backup do Postgres (Supabase)

## TL;DR
- Free tier do Supabase: backup diário automático, retenção ~7 dias
- Pro tier ($25/mês): PITR (Point-in-Time Recovery), retenção 7-30 dias
- Recomendação pré-lançamento: **upgrade pro Pro só pelos backups**, ou rodar dump diário pra S3/local

## Checklist antes do lançamento

- [ ] Confirmar plano Supabase em https://supabase.com/dashboard/project/_/settings/billing
- [ ] Em Database → Backups: ver última data de backup
- [ ] Testar restore num projeto staging (uma vez, pra ter certeza que funciona)
- [ ] Documentar onde está a senha do banco (1Password / Bitwarden) — sem isso, o backup é inútil

## Backup manual via pg_dump

Se quiser um dump local pra guardar offline:

```bash
# Pega a connection string DIRETA (porta 5432, não a pooler 6543) em
# Project Settings → Database → Connection string → URI

PGPASSWORD='xxx' pg_dump \
  -h db.PROJETO.supabase.co \
  -U postgres \
  -d postgres \
  -p 5432 \
  --no-owner \
  --no-acl \
  -F c \
  -f backup-$(date +%Y%m%d).dump
```

Restaurar:
```bash
PGPASSWORD='xxx' pg_restore \
  -h db.PROJETO.supabase.co \
  -U postgres \
  -d postgres \
  --clean --if-exists \
  backup-20260623.dump
```

## Automatizar (opcional)

`scripts/backup-db.sh` faz dump e sobe pro S3/R2. Roda via cron na máquina local ou GitHub Action diária.

Não criei ainda — só vale a pena se a gente passar de uns 50 usuários pagantes. Pré-lançamento, o backup nativo do Supabase basta.

## Risco real

O risco maior NÃO é perder o banco — é perder a **senha do banco** ou **acesso à conta Supabase**. Garantir:

1. Senha do DB salva em gerenciador de senhas
2. Email da conta Supabase com 2FA
3. Recovery codes do 2FA salvos
