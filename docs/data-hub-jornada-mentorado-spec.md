# Jornada do Mentorado — Especificação de dados

## Do protótipo v2.2 (Exclusive) ao schema do Data Hub

> Derivado do levantamento navegável do protótipo *"Prosperus Exclusive — Academy · Jornada do Mentorado (v2.2)"* em 12/08/2026.
> Escopo: modelo de entidades, catálogo de eventos e payloads de API para **um aplicativo, duas interfaces** (Prosperus Club + Exclusive), sobre o banco central do Data Hub.
> Leia junto com: [`data-hub-prosperus.md`](./data-hub-prosperus.md) e [`data-hub-prosperus-v2.md`](./data-hub-prosperus-v2.md) (§12).

---

## 1. O que o protótipo confirma da arquitetura

| Observação do protótipo | Confirmação no Data Hub |
|---|---|
| "Integrado ao log existente do app — este painel lê e escreve no mesmo registro, **não cria um segundo**" | Regra da casa: uma fonte de verdade por assunto (Anexo B da v2). O log de interações é **uma** tabela, compartilhada |
| Registro do mentorado → **confirmação do CS** (venda, movimento binário, sugestão feita) | Regra da casa: ação com efeito real é **dois passos com confirmação humana**. O schema nasce com a fila de pendências |
| "Venda em confirmação **não entra** no ROI, no ticket médio nem no objetivo" | Procedência e confiança no dado (§6 da v2): métricas derivadas só consomem registros **confirmados** |
| Badge `DERIVADO` em ROI, receita acumulada, ticket médio, % objetivo | Derivadas são **calculadas por job/view, nunca gravadas à mão** |
| "Sinais são internos — o mentorado **nunca** os vê" | Views por perfil: campos admin-only separados dos payloads do app |
| Três progressos (Entregáveis · ROI · MLS) + camada dos 10 movimentos | O eixo de marcos **por produto** previsto no §12 da v2 — o Exclusive tem 9 etapas + 10 movimentos; o Club terá seu próprio catálogo |

---

## 2. Modelo de entidades

Convenção: tudo referencia `cliente_id` (único, acima do produto — decisão da Fase 0) e carrega `produto` (`club` | `exclusive`) onde o dado é por-produto.

```sql
-- ── Núcleo (já previsto no Data Hub) ─────────────────────────────
clientes            (cliente_id PK, nome, email, icp, criado_em, ...)
assinaturas         (id, cliente_id, produto, ciclo_id, investimento_valor,
                     investimento_periodo_meses, status, inicio, fim)

-- ── Ciclo e metas ────────────────────────────────────────────────
ciclos              (id, produto, numero,            -- "Ciclo I"
                     duracao_meses,                  -- 6
                     meta_mentorados_alvo,           -- 30
                     meta_ticket_alvo)               -- R$ 60.000
cs_responsavel      (cliente_id, produto, pessoa_id) -- "Caio (CS)"

-- ── P1 · Entregáveis (etapas) ────────────────────────────────────
etapas_catalogo     (id, produto, ciclo_id, numero,  -- 1..9 no Exclusive
                     nome,                           -- "Encontro presencial"
                     descricao, responsaveis[],      -- ["Dani","Joel"]
                     opcional bool,                  -- etapa 5
                     tipo_data)                      -- data|continuo|gatilho
                     -- SEMEADO por produto (índice JSON / catálogo), nunca à mão
etapas_cliente      (id, cliente_id, etapa_id, data_prevista,
                     data_realizacao,                -- carimbada pelo sistema, editável
                     estado,                         -- realizada|marcada|a_agendar|
                                                     -- continuo|prevista|pos_evento|final_ciclo
                     concluido_por, nota)            -- "Marco de mídia: podcast..."

-- ── Quarta camada · 10 Movimentos ────────────────────────────────
movimentos_catalogo (id, produto, nome,              -- "Ser entrevistado em podcasts"
                     titulo_meta,                    -- "6 participações em 6 meses"
                     regra_texto, etapa_vinculada_id NULL,  -- mov.5→etapa4, mov.7→etapa7
                     janela_meses)
submetas_catalogo   (id, movimento_id, rotulo,       -- "Posts e vídeos no Instagram"
                     alvo int,                       -- 180
                     tipo)                           -- contador | binario
submetas_cliente    (id, cliente_id, submeta_id, valor_atual int,
                     estado,                         -- livre | em_confirmacao | confirmada
                     confirmado_por, confirmado_em)
-- % do movimento = média das submetas; score_dos_10 = média dos movimentos (DERIVADO)

-- ── P2 · ROI (vendas) ────────────────────────────────────────────
vendas              (id, cliente_id, produto, data, contratos int,
                     preco_por_contrato, origem,     -- mentorado | cs
                     status,                         -- em_confirmacao | confirmada | recusada
                     confirmado_por, confirmado_em)
-- DERIVADOS (view/job): receita_acumulada, ticket_medio,
-- multiplo_roi = faturado/investido, pct_objetivo = contratos/meta

-- ── P3 · MLS (camada EXCLUSIVE — formação de mentores) ───────────
-- MLS = Mentoring League Society: ecossistema de educação empresarial,
-- networking e desenvolvimento para donos de empresas, liderado por
-- Flávio Augusto, Joel Jota e Caio Carneiro — a Prosperus faz parte dele.
-- P3 tem DUAS FASES conforme o estágio do mentorado:
--   fase 1 · entrada  → critério: 30 mentorados pagantes, ticket médio
--                       mínimo R$ 60k → pct_criterio é DERIVÁVEL das
--                       vendas confirmadas (contratos ≥ ticket mínimo / 30)
--   fase 2 · ranking  → após a entrada, acompanhamento da posição na liga
mls_status          (cliente_id, fase,               -- entrada | ranking
                     estado,                         -- fora | dentro
                     pct_criterio int,               -- DERIVADO (ver nota abaixo)
                     ranking_posicao NULL,           -- fase ranking (ex.: 41)
                     atualizado_por, atualizado_em)
-- Nota: na demo, pct_criterio (58%) ≠ % do objetivo (33% = 10/30) — confirmar
-- a fórmula exata (contam mentorados acumulados? ticket entra no cálculo?)
-- antes de remover o override manual do CS.

-- ── Sugestões e confirmações (dois passos) ───────────────────────
sugestoes           (id, cliente_id, movimento_id, texto, prazo NULL,
                     autor,                          -- CS
                     status)  -- ativa | feita_aguardando_confirmacao | confirmada | recusada
pendencias          (id, cliente_id, tipo,           -- venda | sugestao | movimento_binario
                     payload jsonb, decisao NULL, decidido_por, decidido_em)

-- ── Trilha e conteúdo (liga no catálogo/Academy existente) ───────
trilhas             (id, cliente_id, produto, tema,  -- "Autoridade e Demanda"
                     total_aulas int)
trilha_aulas        (trilha_id, aula_id, posicao, concluida bool, concluida_em)
-- modulos/aulas: derivados do catálogo de conteúdo por job (lessonId/videoId já existem)
-- academy_eventos: play/progresso/conclusão por membro (ver Data Hub v2 §4.3)

-- ── Perfil comportamental · CIS Assessment (whitelabel) ──────────
-- Fonte: perfil.salesprime.app — alimenta a etapa "Devolutiva de perfil"
-- e o dossiê do vendedor (§11.3 da v2). Formato exato do payload a
-- confirmar com o fornecedor; esqueleto:
perfis_comportamentais (id, cliente_id, avaliado_em,
                     perfil_predominante,            -- ex.: perfil DISC/CIS
                     scores jsonb,                   -- fatores e índices brutos
                     relatorio_url NULL,             -- PDF da devolutiva
                     metodologia_versao, origem)     -- whitelabel | import
-- Histórico preservado: uma linha por avaliação (a pessoa pode refazer).
-- Acesso restrito por perfil (LGPD): vendedor vê o do próprio lead.

-- ── Log compartilhado e sinal interno ────────────────────────────
log_interacoes      (id, cliente_id, data, autor, texto,
                     tipo)                           -- nota_interna | interacao | revisao
                     -- MESMA tabela que o app já usa; contrato de dados: alinhar com o Fábio
sinais_admin        (cliente_id, sinal,              -- verde | amarelo | vermelho
                     motivo, atualizado_em)          -- NUNCA exposto ao mentorado
```

**Streak e "registros hoje"** são derivados de `eventos_jornada` (semanas consecutivas com ≥1 evento de avanço; contagem de eventos do dia) — não são colunas.

---

## 3. Catálogo de eventos (`eventos_jornada`)

Todos com `cliente_id`, `produto`, `origem` (app | admin | sistema), `autor`, `timestamp`, `payload`.

| Ator | `tipo_evento` | Payload essencial | Efeito |
|---|---|---|---|
| Mentorado | `submeta_incrementada` | submeta_id, delta ±1, valor_resultante | Imediato no % (streak, "N hoje") |
| Mentorado | `movimento_marcado_concluido` | movimento_id, item binário | → `pendencias` (confirmação CS) |
| Mentorado | `sugestao_marcada_feita` | sugestao_id | → aguardando confirmação (reversível) |
| Mentorado | `pendencia_desfeita` | pendencia_id | Remove da fila |
| Mentorado | `venda_informada` | data, contratos, preço | → `pendencias`; fora das métricas até confirmar |
| Mentorado | `aula_concluida` | trilha_id, aula_id, posicao | Progresso da trilha (7→8 de 12) |
| Mentorado | `cs_acionado` | canal | CTA "Falar com o CS" |
| CS | `etapa_agendada` | etapa_id, data_prevista | — |
| CS | `etapa_concluida` | etapa_id | Sistema carimba `data_realizacao` |
| CS | `venda_registrada` | data, contratos, preço | Direto confirmada; recalcula derivados |
| CS | `mls_atualizada` | estado, pct_criterio | — |
| CS | `pendencia_decidida` | pendencia_id, decisao | "Confirmar libera; recusar devolve" |
| CS | `sugestao_enviada` | movimento_id, texto, prazo | Card destacado na jornada |
| CS | `interacao_registrada` | texto | Escreve no log compartilhado |
| CS | `meta_ciclo_editada` | campos alterados | — |
| Sistema | `derivados_recalculados` | métricas afetadas | ROI, score, streak, sinal |
| Sistema | `assessment_concluido` | assessment_id, perfil_predominante | Via webhook/sync do CIS Assessment; carimba a etapa "Devolutiva de perfil" |

Telemetria leve (expansão de card, clique em recomendação) vai para `academy_eventos`/telemetria, não para `eventos_jornada` — a linha do tempo guarda **fatos da jornada**, não cliques.

---

## 4. Payloads da API por tela

### `GET /api/jornada/:clienteId?produto=exclusive` *(telas Academy + Jornada)*

```jsonc
{
  "cliente": { "nome": "Júlio", "produto": "exclusive",
               "ciclo": { "numero": "I", "mes_atual": 3, "duracao_meses": 6,
                          "meta": { "mentorados_alvo": 30, "ticket_alvo": 60000 } },
               "cs": { "nome": "Caio" } },
  "progressos": {
    "entregaveis": { "atual": 3, "total": 9,
                     "etapa_atual": { "numero": 4, "nome": "Encontro presencial",
                                      "detalhe": "com Dani e Joel, 20/08" } },
    "roi": { "multiplo": 0.43, "faturado": 1500000, "investido": 3500000,
             "contratos": 10, "ticket_medio": 150000,
             "objetivo": { "atual": 10, "alvo": 30, "pct": 33 } },
    "mls": { "estado": "fora", "pct_criterio": 58, "ranking_posicao": null }
  },
  "streak": { "semanas": 3, "registros_hoje": 2 },
  "etapas": [ { "numero": 4, "nome": "Encontro presencial",
                "responsaveis": ["Dani","Joel"], "descricao": "...",
                "estado": "marcada", "data": "2026-08-20", "nota": "Depois: JJ Podcast..." } ],
  "movimentos": [ { "nome": "Operação de conteúdo multiplataforma", "pct": 43,
                    "status": "em_movimento", "etapa_vinculada": null,
                    "submetas": [ { "rotulo": "Posts e vídeos no Instagram",
                                    "valor": 112, "alvo": 180, "tipo": "contador" } ],
                    "regra": "Fecha quando as três frentes fecham..." } ],
  "score_dos_10": 20,
  "sugestao_ativa": { "movimento": "Podcasts", "texto": "Grave o episódio com a Maria Fernanda...",
                      "autor": "Caio", "prazo": "2026-09-20", "status": "ativa" },
  "trilha": { "tema": "Autoridade e Demanda", "concluidas": 7, "total": 12,
              "proxima_aula": "Oferta e ancoragem de ticket" },
  "modulos": [ { "categoria": "MÉTODO", "titulo": "Os 4 M's da mentoria",
                 "responsavel": "Dani", "aulas": 6 } ],
  "atualizado_por": { "autor": "Caio", "data": "2026-08-05" }
}
```

### Escritas do mentorado *(todas via app, autenticadas)*

```
POST /api/jornada/:clienteId/submetas/:id/registro     { "delta": 1 }
POST /api/jornada/:clienteId/movimentos/:id/concluir    → cria pendência
POST /api/jornada/:clienteId/sugestoes/:id/feito        → aguardando confirmação
DELETE /api/jornada/:clienteId/pendencias/:id           → desfazer
POST /api/jornada/:clienteId/vendas                     { data, contratos, preco } → pendência
POST /api/jornada/:clienteId/trilha/aulas/:id/concluir
```

### `GET /api/admin/squad/:csId/mentorados` *(Admin · Lista)*

Linha: `{ sinal, nome, etapas: "4/9", roi: 0.43, mls: {estado, pct|ranking}, score10: 20, atualizacao }` — ordenada por atenção (sinal), **campos de sinal jamais servidos aos endpoints do app**.

### Escritas do CS *(Admin · Detalhe)*

```
PUT  /api/admin/mentorados/:id/meta-ciclo
PUT  /api/admin/mentorados/:id/etapas/:etapaId         { data_prevista }
POST /api/admin/mentorados/:id/etapas/:etapaId/concluir  → sistema carimba data
POST /api/admin/mentorados/:id/vendas                    → direto confirmada
PUT  /api/admin/mentorados/:id/mls                     { estado, pct_criterio }
POST /api/admin/pendencias/:id/decidir                 { decisao: "confirmar"|"recusar" }
POST /api/admin/mentorados/:id/sugestoes               { movimento_id, texto, prazo? }
POST /api/admin/mentorados/:id/log                     { texto }   → log compartilhado
```

---

## 5. Regras de cálculo (derivados — view/job, nunca gravados à mão)

| Derivado | Regra (do protótipo) |
|---|---|
| % do movimento | Média das submetas (`valor/alvo` limitado a 100%) — "o percentual é a média das sub-metas" |
| Score dos 10 | Média dos 10 movimentos — "mede completude do caminho, não desempenho" |
| Múltiplo de ROI | `faturado_confirmado / investido` — vendas em confirmação **não entram** |
| Ticket médio / % objetivo | Sobre vendas confirmadas; objetivo = contratos ÷ meta do ciclo |
| Streak | Semanas consecutivas com ≥1 evento de avanço do mentorado |
| Registros hoje | Contagem de eventos de avanço no dia |
| Sinal (admin) | A definir: regra sugerida = combinação de dias sem avanço + etapa atrasada + pendência parada |

---

## 6. Divergências e decisões pendentes (do próprio protótipo)

1. **Nomes de etapa divergem** entre a visão do mentorado e o admin (ex.: "Seu evento presencial" × "Evento do mentorado") — *decisão adiada (12/08)*: padronização fica para depois; até lá o catálogo carrega `nome` + `nome_admin`.
2. **Admin omite as etapas 6, 8 e 9** (contínuo/gatilho) — confirmar se são não-agendáveis por design.
3. **Critério da MLS** — ✅ *resolvido (12/08)*: MLS = **Mentoring League Society**, ecossistema de educação empresarial, networking e desenvolvimento para donos de empresas, liderado por Flávio Augusto, Joel Jota e Caio Carneiro, do qual a Prosperus faz parte. O critério de entrada é **30 mentorados pagantes com ticket médio mínimo de R$ 60k** — logo `pct_criterio` é **derivável das vendas confirmadas**, e a meta do ciclo é o próprio critério. P3 tem **duas fases** conforme o estágio do mentorado: *entrada* (progresso no critério) e, depois, *acompanhamento no ranking* da liga. Essa camada é **específica do Exclusive** (formação de mentores). *Detalhe residual*: na demo, 58% (MLS) ≠ 33% (objetivo = 10/30) — confirmar a fórmula exata antes de remover o override manual do CS.
4. **Contrato de dados do log compartilhado** — o protótipo manda "alinhar com o Fábio"; é pré-requisito da tabela `log_interacoes`.
5. **Escala do squad** — ✅ *resolvido (12/08)*: a escala real é **30 mentorados por ciclo** (a meta do ciclo); o "8 ativos" com 5 linhas era dado de demonstração. A tela Admin · Lista deve ser dimensionada para ~30 linhas por CS/squad, com a ordenação por atenção (sinal) fazendo o trabalho de priorização.
6. **Versão Club** — *direção confirmada (12/08)*: esta mesma estrutura de jornada **será encaixada na jornada do Prosperus Club** em seguida. O Club usa os mesmos contêineres com **catálogos próprios** (marcos do CS de 12 meses no lugar das 9 etapas; movimentos próprios se fizer sentido) — é exatamente o que as tabelas `*_catalogo` por produto parametrizam. A camada P3/MLS **não se aplica ao Club** (é específica da formação de mentores do Exclusive); o P3 do Club, se existir, será outro indicador de resultado. Mapear com o RevOps o análogo Club de cada camada quando chegar a hora.

---

## 7. Encaixe nas fases do Data Hub

- **Fase 0**: este spec **pressupõe** `clientes` persistida com `cliente_id` único acima do produto e o eixo duplo de jornada — mais um insumo para as decisões.
- **Fase 1**: `clientes`, `eventos_jornada` (com o catálogo de eventos da §3), `ciclos`, `etapas_*`.
- **Fase 2 (Academy)**: `trilhas`, `trilha_aulas`, `academy_eventos` — o protótipo confirma que **conclusão de aula é o evento mínimo** (não há player no mock; instrumentar no app real).
- **Fase 4 (superfícies)**: os payloads da §4 são a definição da API interna; o mentor IA (copiloto por tenant) consome os mesmos dados para responder ao mentorado sobre a própria jornada.
