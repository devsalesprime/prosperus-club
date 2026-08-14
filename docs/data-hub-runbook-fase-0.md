# Data Hub — Runbook da Fase 0

## Do zero ao banco pronto, passo a passo

> **Objetivo da Fase 0:** subdomínio no ar com HTTPS, banco criado e schema base aplicado — pronto para a Fase 1 (sync do HubSpot) começar.
> **Onde:** VPS Hostinger (Ubuntu 24.04, KVM 4). Padrão da casa: **systemd + nginx em loopback**, sem Docker Compose novo.
> **Subdomínio:** `hub.prosperusclub.com.br`
> **Decisões que este runbook implementa:** [v2 §8 Fase 0](./data-hub-prosperus-v2.md) — eixo duplo (preenchimento começa pelo CS), `clientes` persistida, WhatsApp híbrido, migration de 07/08 como base.

---

## Ordem de execução

```
0. Pré-requisitos ──▶ 1. Cloudflare (DNS) ──▶ 2. nginx + TLS ──▶ 3. Postgres
                                                                      │
      6. Checklist de saída ◀── 5. Serviço de health ◀── 4. Schema base
```

Cada passo tem **verificação** — não avance sem ela passar.

---

## Passo 0 · Pré-requisitos (antes de tocar em qualquer coisa)

| Item | Como confirmar | Se faltar |
|---|---|---|
| Acesso root/sudo ao VPS | `ssh <user>@<vps>` + `sudo -v` | — |
| Acesso ao Cloudflare (zona `prosperusclub.com.br`) | Login no painel | Pedir a quem administra o DNS |
| Postgres 16 rodando | `systemctl status postgresql` | Já roda (pgvector em produção) |
| pgvector disponível | `sudo -u postgres psql -c "SELECT * FROM pg_available_extensions WHERE name='vector';"` | `apt install postgresql-16-pgvector` |
| Porta livre fora das faixas ocupadas | `ss -ltnp \| grep 8950` | Escolher outra livre (ver §7.5 da v2) |
| **Migration de 07/08 em mãos** | Arquivo `.sql` disponível | ⚠️ **Bloqueia o Passo 4** — decisão 4-A depende dela |

> **Reserva de porta sugerida:** `8950` para a API do hub e `8951` para o MCP — fora das faixas 8765–8949 já em uso/reservadas, e longe do alocador automático do painel (8780–8799).

**Antes de começar, um snapshot:** o VPS não tem backup completo agendado (v2 §7.3). Tire um snapshot no painel da Hostinger antes de mexer.

---

## Passo 1 · Cloudflare — criar o subdomínio

No painel Cloudflare → zona `prosperusclub.com.br` → **DNS → Records → Add record**:

| Campo | Valor |
|---|---|
| Type | `A` |
| Name | `hub` |
| IPv4 address | *(IP público do VPS)* |
| Proxy status | **Proxied** (nuvem laranja) ✅ |
| TTL | Auto |

**Por que Proxied:** esconde o IP de origem, dá DDoS protection e WAF de graça, e permite as regras do Passo 1.1. O custo é que o IP real do visitante chega no header `CF-Connecting-IP` — o nginx precisa ser configurado para lê-lo (Passo 2).

### 1.1 Regras recomendadas (opcional, mas barato de fazer agora)

- **SSL/TLS → Overview:** modo **Full (strict)** — exige certificado válido na origem, que o Passo 2 instala;
- **Security → WAF → Rate limiting:** uma regra em `/api/*` (ex.: 100 req/min por IP) — o Data Hub serve dado sensível;
- **Rules → Configuration Rules:** desligar cache em `hub.prosperusclub.com.br/*` (é API, não site).

### ✅ Verificação

```bash
dig +short hub.prosperusclub.com.br
# Proxied: retorna IPs da Cloudflare (104.x / 172.x) — correto, não o IP do VPS
```

---

## Passo 2 · nginx — server block e certificado

### 2.1 Certificado TLS

Com o Cloudflare em Proxied, o `certbot --nginx` (HTTP-01) ainda funciona porque a Cloudflare encaminha o desafio. Se falhar, use DNS-01 com o plugin do Cloudflare.

```bash
sudo certbot --nginx -d hub.prosperusclub.com.br
```

### 2.2 Server block

```nginx
# /etc/nginx/sites-available/hub.prosperusclub.com.br
server {
    listen 443 ssl http2;
    server_name hub.prosperusclub.com.br;

    ssl_certificate     /etc/letsencrypt/live/hub.prosperusclub.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hub.prosperusclub.com.br/privkey.pem;

    # IP real do visitante atrás da Cloudflare
    real_ip_header CF-Connecting-IP;
    set_real_ip_from 173.245.48.0/20;   # lista completa: cloudflare.com/ips
    # ... demais faixas da Cloudflare ...

    add_header X-Robots-Tag "noindex, nofollow" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # API interna
    location /api/ {
        proxy_pass http://127.0.0.1:8950;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Endpoint MCP (Fase 4 — deixa preparado)
    location /mcp {
        proxy_pass http://127.0.0.1:8951;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;          # SSE
        proxy_read_timeout 3600s;
    }

    location /health {
        proxy_pass http://127.0.0.1:8950/health;
        access_log off;
    }
}

server {
    listen 80;
    server_name hub.prosperusclub.com.br;
    return 301 https://$host$request_uri;
}
```

> **Regra da casa:** toda mudança de nginx passa por `nginx -t` antes do reload, com rollback em caso de falha (Anexo B da v2).

```bash
sudo ln -s /etc/nginx/sites-available/hub.prosperusclub.com.br /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### ✅ Verificação

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://hub.prosperusclub.com.br/health
# 502 neste momento é ESPERADO (nada escutando na 8950 ainda) — significa que TLS e proxy funcionam
```

---

## Passo 3 · Postgres — database, usuários e extensões

Dois usuários desde o início, porque a decisão de segurança da v2 é **read-only imposto pela infraestrutura**:

```bash
sudo -u postgres psql <<'SQL'
-- Database do Data Hub (no Postgres que já roda — sem infra nova)
CREATE DATABASE datahub
  WITH ENCODING 'UTF8' LC_COLLATE='pt_BR.UTF-8' LC_CTYPE='pt_BR.UTF-8' TEMPLATE=template0;

-- Dono: aplicação (escreve — sync-service e API)
CREATE ROLE datahub_app  WITH LOGIN PASSWORD '<senha-forte-app>';
-- Consulta: IA / MCP (NUNCA escreve)
CREATE ROLE datahub_read WITH LOGIN PASSWORD '<senha-forte-read>';

ALTER DATABASE datahub OWNER TO datahub_app;
SQL

sudo -u postgres psql -d datahub <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;      -- busca semântica (Fase 3)
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid()
CREATE SCHEMA IF NOT EXISTS hub AUTHORIZATION datahub_app;

-- Read-only de verdade, inclusive para tabelas futuras
GRANT CONNECT ON DATABASE datahub TO datahub_read;
GRANT USAGE ON SCHEMA hub TO datahub_read;
GRANT SELECT ON ALL TABLES IN SCHEMA hub TO datahub_read;
ALTER DEFAULT PRIVILEGES FOR ROLE datahub_app IN SCHEMA hub
  GRANT SELECT ON TABLES TO datahub_read;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
```

**Senhas** ficam em `/etc/prosperus/datahub.env` com `chmod 600` (nunca no git; o systemd lê via `EnvironmentFile`).

**Memória:** o VPS já foi a 100% de swap uma vez (v2 §7.3) — declare `MemoryMax` na unit de cada serviço desde a primeira (Passo 5).

### ✅ Verificação

```bash
# App escreve
PGPASSWORD='<app>' psql -h 127.0.0.1 -U datahub_app -d datahub \
  -c "CREATE TABLE hub.t(i int); DROP TABLE hub.t;"
# Read-only NÃO escreve (deve dar ERROR: permission denied)
PGPASSWORD='<read>' psql -h 127.0.0.1 -U datahub_read -d datahub \
  -c "CREATE TABLE hub.t(i int);"
```

---

## Passo 4 · Schema base (a partir da migration de 07/08)

⚠️ **Bloqueado até a migration estar em mãos** — a decisão 4-A é *aproveitá-la como base*. O trabalho aqui é em três tempos:

1. **Diff**: comparar as 12 tabelas / 29 policies da migration com o modelo do Data Hub — o que ela já cobre (o log de eventos de jornada), o que precisa ser adicionado, o que sobra;
2. **Migration incremental** (`001_base.sql`), que aplica o que falta:
   - `clientes` — com `cliente_id` estável; **o resolvedor existente é a fonte** (não reimplementar identidade)
   - `eventos_jornada` — com **as duas colunas de eixo** (`fase_funil`, `marco_cs`); preenchimento começa só pelo CS
   - enums de fase/marco **semeados do índice JSON da jornada**, nunca escritos à mão
   - `assinaturas` (dimensão `produto`: club | exclusive)
   - `sync_log` (controle de ingestão: fonte, janela, status, retomada)
3. **Convenções**: toda tabela com `criado_em`/`atualizado_em`; todo registro derivado com procedência e confiança; piso de confiabilidade por fonte declarado (WhatsApp: 11/06/2026 — Anexo C).

> Controle de versão do schema: migrations numeradas em `db/migrations/NNN_nome.sql`, aplicadas por script idempotente. Nada de DDL manual em produção.

### ✅ Verificação

```sql
\dt hub.*                                    -- tabelas criadas
SELECT COUNT(*) FROM hub.fases_jornada;      -- enum semeado, não vazio
```

---

## Passo 5 · Serviço de health (fecha o circuito)

Um serviço mínimo que responde `/health` — valida a cadeia inteira (Cloudflare → nginx → serviço → Postgres) antes de qualquer lógica de negócio.

```ini
# /etc/systemd/system/datahub-api.service
[Unit]
Description=Prosperus Data Hub — API
After=network.target postgresql.service

[Service]
Type=simple
User=datahub
Group=datahub
WorkingDirectory=/opt/prosperus/datahub
EnvironmentFile=/etc/prosperus/datahub.env
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5

# Hardening — padrão da casa (v2 Anexo B): o deployer que gera unit
# gera JÁ endurecida, senão o próximo restart desfaz em silêncio
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ReadWritePaths=/opt/prosperus/datahub/tmp
MemoryMax=1G

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd -r -s /usr/sbin/nologin datahub
sudo systemctl daemon-reload && sudo systemctl enable --now datahub-api
```

O `/health` deve checar: processo vivo + **conexão com o Postgres** (`SELECT 1`), retornando `{"status":"ok","db":"ok","versao":"..."}`.

### ✅ Verificação

```bash
curl -sS https://hub.prosperusclub.com.br/health
# {"status":"ok","db":"ok"} — cadeia completa funcionando
```

---

## Passo 6 · Checklist de saída da Fase 0

- [ ] Snapshot do VPS tirado antes de começar
- [ ] `hub.prosperusclub.com.br` resolvendo via Cloudflare (Proxied)
- [ ] HTTPS válido, Full (strict), HTTP redirecionando para HTTPS
- [ ] Rate limiting em `/api/*` e cache desligado
- [ ] Database `datahub` criado no Postgres existente, com `vector` e `pgcrypto`
- [ ] `datahub_app` escreve; `datahub_read` **não** escreve (testado)
- [ ] Credenciais em `/etc/prosperus/datahub.env` (chmod 600), fora do git
- [ ] Schema base aplicado a partir da migration de 07/08, com enums semeados
- [ ] `datahub-api` no systemd, endurecida e com `MemoryMax`
- [ ] `/health` respondendo `ok` de ponta a ponta
- [ ] **Backup diário do `datahub` agendado com retenção externa** ⭐ *(primeira política de backup real da casa — não deixar para depois)*
- [ ] Repositório do código criado e primeiro commit feito

---

## Pendências que bloqueiam ou atrasam

| # | Pendência | Bloqueia | Como destravar |
|---|---|---|---|
| 1 | **Migration de 07/08** | Passo 4 | Commitar na branch, adicionar o repo ao escopo, ou colar o SQL |
| 2 | **Repositório do código** | Passos 4–5 | Criar (sugestão: `devsalesprime/prosperus-data-hub`) ou indicar o monorepo |
| 3 | IP público do VPS | Passo 1 | — |
| 4 | Acesso ao Cloudflare | Passo 1 | — |

---

## Depois da Fase 0 — o que vem na Fase 1

1. **Sync do HubSpot** (a fonte mais rica; leitura já existe hoje) → popula `clientes` e `eventos_jornada`
2. **Absorver SLA e log de relacionamento**, declarando o piso de 11/06/2026
3. **Primeira consulta útil ao time** — antes de qualquer dashboard
4. Academy: costurar `videoId` do Bunny ao catálogo *(depende de resolver a conta Bunny)*

**Critério de sucesso da Fase 1:** CS e Sales OPS fazendo, em linguagem natural, uma pergunta que hoje é impossível de responder.

---

*Documentos relacionados: [Arquitetura](./data-hub-prosperus.md) · [Estado real e decisões](./data-hub-prosperus-v2.md) · [Spec da Jornada](./data-hub-jornada-mentorado-spec.md) · [Pauta da reunião](./reuniao-alinhamento-data-hub.md)*
