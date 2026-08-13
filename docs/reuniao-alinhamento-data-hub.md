# Reunião de Alinhamento — Prosperus Data Hub

## Pauta comentada

> **Participantes:** 2 Tech · 1 CS · 1 Sales OPS
> **Duração sugerida:** 60–90 min
> **Objetivo da reunião:** sair com as 4 decisões da Fase 0 tomadas — são elas que destravam o início da construção.
> **Material de apoio:** [Arquitetura (v1)](./data-hub-prosperus.md) · [Estado real (v2)](./data-hub-prosperus-v2.md) · [Spec da Jornada](./data-hub-jornada-mentorado-spec.md)

---

## Parte 1 — Contexto (10 min, para nivelar todo mundo)

### O que é o Data Hub, em uma frase

Um banco de dados central que junta tudo que hoje está espalhado — HubSpot, app, planilhas, WhatsApp, financeiro, Academy, perfil comportamental — e deixa a IA e as aplicações consultarem esses dados em um lugar só.

### O que ele resolve, na prática

Hoje **ninguém consegue responder** perguntas como:

- *"Quais clientes fecharam em julho e abriram ticket de suporte em 30 dias?"*
- *"Quem comprou há 30 dias e nunca acessou o Academy?"* (lista de ação para o CS)
- *"Clientes com esse perfil comportamental fecham mais com qual oferta?"*

Não por falta de dados — eles existem — mas porque **cada sistema guarda o seu pedaço e nenhum conversa com o outro**. O Data Hub cria duas coisas que não existem hoje: um **código único por cliente** (`cliente_id`) e uma **linha do tempo por cliente** (todos os eventos dele, da campanha ao pós-venda, em ordem).

### O que já temos (boa notícia)

Um levantamento técnico mostrou que **muita coisa já está pronta e em produção**: o banco com busca inteligente (pgvector), os conectores de IA que ~13 pessoas do time já usam no Claude, a resolução de identidade (quem é quem entre HubSpot/WhatsApp/Marvee), o SLA de resposta do CS, a esteira de transcrição de aulas. **Não vamos reconstruir nada disso** — vamos preencher os dois buracos: o código único e a linha do tempo.

---

## Parte 2 — As 4 decisões do dia (40 min — o coração da reunião)

### Decisão 1 · Qual é o "eixo" da linha do tempo do cliente? *(todos opinam)*

**Explicando simples:** quando olharmos a jornada de um cliente, queremos ver o quê?

- **Opção A — Funil comercial** (as 10 fases Marketing → Vendas → CS): mostra o caminho até virar cliente. Bom para Vendas/OPS, mas 6 das 10 fases acontecem *antes* de a pessoa ser cliente.
- **Opção B — Ciclo de vida no CS** (os 11 marcos dos 12 meses): mostra a vida do cliente *depois* de entrar. Bom para o CS, mas perde a origem (de onde ele veio, qual campanha).
- **Opção C — Os dois, em colunas separadas**: cada evento marca em qual fase do funil E em qual marco do CS aconteceu.

**Recomendação: C (os dois).** Custa quase nada a mais e atende Vendas, OPS e CS ao mesmo tempo.
**Quem valida:** CS confirma que os 11 marcos estão atuais; Sales OPS confirma as 10 fases.

### Decisão 2 · Criamos a tabela de clientes ou continuamos montando na hora? *(mais técnica, mas todos precisam entender)*

**Explicando simples:** hoje, quando alguém pergunta "quem é esse cliente?", o sistema **monta a resposta na hora**, juntando HubSpot + WhatsApp + Marvee. Funciona bem para consultar **uma pessoa**, mas torna impossível perguntas sobre **todos de uma vez** ("quantos clientes fizeram X?").

- **Opção A — Continuar como está**: sem tabela. Perguntas analíticas continuam impossíveis.
- **Opção B — Criar a tabela `clientes`**: cada cliente ganha um código único e fica salvo. As perguntas analíticas passam a existir.

**Recomendação: B**, com uma condição técnica importante: **a lógica que já sabe juntar as identidades (e que já trata pegadinhas, tipo "o contato do negócio no HubSpot é o vendedor, não o cliente") vira a fonte da tabela** — não se cria uma segunda lógica do zero.
**Atenção:** existe uma documentação interna antiga dizendo para *não* criar essa tabela. A decisão aqui é **revertê-la conscientemente**, e registrar isso.

### Decisão 3 · WhatsApp: continuamos na Evolution, migramos para a API oficial da Meta, ou híbrido? *(CS é peça-chave)*

**Explicando simples:** todo o WhatsApp da operação roda hoje na Evolution (não oficial). Ela funciona, mas tem risco de banimento e dá trabalho técnico. A API oficial da Meta é segura, mas tem dois custos práticos:

- **Não funciona em grupos** — a transcrição de áudio de grupos morreria;
- Fora da janela de 24h, só se envia **template aprovado e pago** — muda o dia a dia do CS.

**Recomendação: híbrido com fronteira escrita.** Evolution fica para grupos e histórico; os números do CS migram um a um para a API oficial, começando com um **piloto de 30 dias com um número só**. As regras de SLA já construídas são portadas (não se perde nada).
**Quem valida:** CS avalia o impacto dos templates pagos na rotina; Tech dimensiona o piloto.

### Decisão 4 · O que fazer com a migration parada de 07/08? *(decisão dos 2 Tech)*

**Explicando simples:** já existe um "projeto de banco" pronto e validado (12 tabelas, 29 regras de segurança) que inclui um registro de eventos de jornada — parecido com o que o Data Hub quer criar. Ele nunca foi aplicado.

- **Opção A — Aproveitar**: a migration entra como base e o Data Hub evolui a partir dela.
- **Opção B — Substituir**: o Data Hub nasce com schema próprio e a migration é arquivada.
- **Opção C — Coexistir**: as duas convivem (⚠️ risco de criar duas verdades — evitar).

**Recomendação:** os 2 Tech comparam os dois schemas **antes da reunião** (30 min de leitura) e trazem a resposta pronta. A ser decidido entre A e B — C só com fronteira muito clara.

---

## Parte 3 — Alinhamentos rápidos por área (20 min)

### Com o CS

1. **Jornada dos 12 meses**: confirmar os 11 marcos (serão o eixo da linha do tempo — Decisão 1).
2. **App da Jornada**: a estrutura do Exclusive (9 etapas + 10 movimentos) será adaptada para o Club — o CS ajudará a definir o análogo Club de cada camada (não precisa ser nesta reunião, só ciência).
3. **Confirmações**: no modelo novo, tudo que o cliente registra (venda, entrega concluída) passa pela **confirmação do CS antes de valer** — igual ao protótipo do Exclusive. Validar que o fluxo faz sentido na rotina.

### Com o Sales OPS

1. **Planilhas**: listar quais planilhas de controle existem e quais entram na Fase 1 (serão sincronizadas automaticamente — ninguém mais copia/cola).
2. **CIS Assessment**: o perfil comportamental entra no banco via export automático. Novidade útil: dá para **disparar o assessment automaticamente na venda** (integração Hotmart/Guru/Pagarme já existe no painel) — definir se queremos ativar e em quais campanhas.
3. **10 fases do funil**: confirmar que o índice atual está correto (Decisão 1).

### Com os Tech

1. **Infra**: Data Hub nasce no padrão da casa (systemd + nginx, database novo no Postgres que já roda) — **sem Docker Compose novo**, salvo decisão explícita em contrário.
2. **Backup**: o dump diário com retenção externa entra como entrega da Fase 1 — hoje **não existe backup completo agendado** no VPS (é a primeira política de backup real da casa).
3. **Portas**: alocar o Data Hub fora das faixas já usadas (lista no §7.5 da v2).
4. **Autenticação**: o Data Hub nasce com token de verdade (não segredo na URL) — serve dado sensível de cliente.

---

## Parte 4 — Perguntas em aberto (10 min — respostas curtas)

| # | Pergunta | Quem responde |
|---|---|---|
| 1 | Temos credencial para ler o banco do app (Supabase) direto, ou seguimos via Edge Function? | Tech |
| 2 | Qual a frequência de dado que o time precisa: tempo real ou sync de hora em hora basta? *(muda muito a complexidade — hora em hora resolve 90% dos casos)* | Todos |
| 3 | Quem opera o Data Hub no dia a dia depois do go-live? | Tech + gestão |
| 4 | Contrato de dados do log compartilhado do app — agendar conversa com o Fábio | Tech |
| 5 | Conta do Bunny.net (venceu e a library foi apagada) — quem resolve a renovação? | Gestão |
| 6 | Módulo de IA: as tools novas entram no conector que cada pessoa já tem (módulos "Jornada" e "Análises") — ciência de todos, sem decisão | — |

---

## Parte 5 — O que acontece depois da reunião (5 min)

Com as 4 decisões tomadas, a **Fase 1** começa:

1. Database criado no Postgres existente + schema (`clientes` + `eventos_jornada`)
2. Sync do HubSpot (a fonte mais rica) + absorção do SLA e do log de relacionamento
3. **Primeira consulta útil ao time antes de qualquer dashboard** — ex.: *"lista de clientes sem acesso ao Academy nos primeiros 14 dias"* direto no Claude de cada um
4. Backup diário ativado

**Critério de sucesso da Fase 1:** o CS e o Sales OPS conseguirem fazer, em linguagem natural, uma pergunta que hoje é impossível de responder.

---

*Documentos completos: [Arquitetura](./data-hub-prosperus.md) · [Estado real + decisões (v2)](./data-hub-prosperus-v2.md) · [Spec da Jornada do Mentorado](./data-hub-jornada-mentorado-spec.md)*
