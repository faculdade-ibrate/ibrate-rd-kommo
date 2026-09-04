# Faculdade Ibrate · RD Station → Kommo

Aplicação independente que recebe conversões do **Formulário de Pré-matrícula**, do **WhatsApp do site**, da **Pré inscrição cursos** da Equilibra e das **Agendas de Cursos** do RD Station e cria ou atualiza o contato e a oportunidade na conta `ibrate.kommo.com`.

## Regras atuais

- Evento RD: `Formulário de Pré-matrícula`.
- Evento RD do WhatsApp: `whatsapp-site`.
- Evento RD da Equilibra: `Pré inscrição cursos` (rota `pre-inscricao-cursos`).
- Formulários gerais da Equilibra: `Pré inscrição Equilibra` e `Contato Equiliba`/`Contato Equilibra`.
- WhatsApp da Equilibra: `whatsapp-site-equilibra`.
- LP de curso: `pos-fisioterapia-dermatofuncional`.
- LP de curso: `pos-reabilitacao-neurofuncional-pediatrica`.
- Rota de automação: `pre-matricula`.
- Canal automático das agendas: identificadores iniciados por `agenda-de-cursos-`.
- A cidade é extraída de formatos como `agenda-de-cursos-em-cascavel`, `agenda-de-cursos-curitiba` e `agenda-de-pos-em-curitiba`.
- `Curitiba` → `Funil Curitiba` → `NOVOS LEADS RD`.
- `Chapecó`, `Balneário Camboriú` e `Joinville` → `Funil Santa Catarina` → `NOVOS LEADS RD`.
- `Cascavel` e `Londrina` → `Funil Interior do PR` → `NOVOS LEADS RD`.
- `Equilibra (Curitiba)` e `Equilibra (CWB)` → `Funil Equilibra` → `NOVOS LEADS RD`.
- Cidades ainda não configuradas são ignoradas com o motivo registrado no log.
- O contato é localizado por telefone ou e-mail. Uma oportunidade aberta é unificada por funil regional: cidades da mesma região atualizam a mesma oportunidade; uma região diferente cria outra.
- Nome da oportunidade: `Curso | Cidade`.
- Campos personalizados da oportunidade: `Curso`, `Unidade`, `Data do Curso` e `Formação`.
- Nas LPs de agenda, `curso_de_interesse` é gravado como `Curso`; `Unidade` é derivada do identificador e `Data do Curso` fica vazia quando não existir no formulário.
- No evento `whatsapp-site`, `Qual curso você está buscando?` e `Unidade da sua escolha` têm prioridade sobre dados históricos da RD; `Data do Curso` é limpa por não existir nesse formulário.
- O campo `Formação` é aceito na pré-matrícula, agendas, WhatsApp da Ibrate e em todas as entradas da Equilibra.
- Na `Pré inscrição cursos`, `Curso de Interesse` é gravado como `Curso`, a unidade é fixada como `Equilibra (Curitiba)` e `Mensagem` é ignorada.
- Em `Pré inscrição Equilibra` e `Contato Equilibra`, somente `Mensagem` é gravada como campo personalizado; a unidade é fixada como `Equilibra (Curitiba)` e dados históricos de curso, formação e data são ignorados.
- No `whatsapp-site-equilibra`, `Qual curso você está buscando?` é gravado como `Curso`; a unidade é fixada como `Equilibra (Curitiba)` e dados históricos são ignorados.
- Na LP `pos-fisioterapia-dermatofuncional`, o curso é fixado como `Pós-Graduação em Fisioterapia Dermatofuncional`; `Formação` e `Unidade da sua escolha` vêm do formulário e definem os campos e o funil regional.
- Na pré-matrícula Ibrate, a tag enviada é `Pré-matrícula`.
- Nas agendas, a tag enviada é `Agenda de Cursos`.
- No `whatsapp-site`, a tag enviada é `WhatsApp`.
- Nas pré-inscrições da Equilibra, as tags enviadas são `Pré-inscrição` e `Equilibra`.
- Nos contatos da Equilibra, as tags enviadas são `Contato` e `Equilibra`.
- No `whatsapp-site-equilibra`, as tags enviadas são `WhatsApp` e `Equilibra`.

## Variáveis da Vercel

Copie os nomes de `.env.example` para o projeto da Ibrate na Vercel.

- `KOMMO_SUBDOMAIN=ibrate`
- `KOMMO_LONG_LIVED_TOKEN`: token de longa duração da conta Ibrate.
- `RD_WEBHOOK_SECRET`: segredo longo e exclusivo deste webhook.
- `KOMMO_CURITIBA_ENTRY_STAGE_NAME=NOVOS LEADS RD`: etapa inicial do Funil Curitiba.
- `KOMMO_SANTA_CATARINA_PIPELINE_NAME=Funil Santa Catarina`
- `KOMMO_SANTA_CATARINA_ENTRY_STAGE_NAME=NOVOS LEADS RD`
- `KOMMO_INTERIOR_PR_PIPELINE_NAME=Funil Interior do PR`
- `KOMMO_INTERIOR_PR_ENTRY_STAGE_NAME=NOVOS LEADS RD`
- `KOMMO_EQUILIBRA_PIPELINE_NAME=Funil Equilibra`
- `KOMMO_EQUILIBRA_ENTRY_STAGE_NAME=NOVOS LEADS RD`
- `KOMMO_SYNC_ENABLED=false`: modo seguro para validar o payload sem gravar na Kommo.

Os nomes dos funis possuem padrões no código, mas também podem ser alterados pelas variáveis correspondentes.

## Webhook

Para o fluxo de automação **Enviar Leads para Integração** do RD:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd/pre-matricula/SEU_SEGREDO
```

Para uma automação que reúne várias LPs de agenda, use na ação **Enviar Leads para Integração**:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd/agendas/SEU_SEGREDO
```

Para reunir as entradas gerais da Equilibra em uma única automação — **Pré inscrição Equilibra**, **Contato Equilibra** e **whatsapp-site-equilibra** — use:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd/equilibra/SEU_SEGREDO
```

O canal identifica a última conversão no contato, aplica o mapeamento específico do formulário e ignora eventos que não pertençam a esse grupo. O `whatsapp-site` da Ibrate permanece em sua própria automação e `Ibrate (Curitiba)` é tratado como Curitiba; a agenda da Equilibra permanece no canal de agendas. Os endpoints separados anteriores continuam compatíveis.

Para reunir LPs específicas de cursos em uma automação própria, use:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd/cursos/SEU_SEGREDO
```

O canal identifica o slug da última conversão, define o curso cadastrado para a LP e usa `Unidade da sua escolha` para selecionar o funil regional. Estão cadastradas as LPs `pos-fisioterapia-dermatofuncional` e `pos-reabilitacao-neurofuncional-pediatrica`.
As oportunidades desse canal recebem somente a tag `LP`.

Ao atualizar uma oportunidade aberta, a integração remove as classificações antigas que ela própria gerencia e mantém apenas as tags do fluxo mais recente.

Nesse formato, a aplicação lê o identificador da última conversão dentro do payload da automação e extrai a cidade. Ao incluir uma nova LP como entrada dessa automação, ela será reconhecida automaticamente se o identificador seguir os padrões `agenda-de-cursos-[cidade]`, `agenda-de-cursos-em-[cidade]` ou `agenda-de-pos-em-[cidade]`.

Para o webhook padrão de conversão:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd?secret=SEU_SEGREDO
```

Para o webhook exclusivo das agendas, configure o evento **Conversão**, sem filtrar conversões específicas, usando:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd/agendas/SEU_SEGREDO
```

Esse canal ignora qualquer conversão que não tenha um identificador iniciado por `agenda-de-cursos-`. Assim, novas agendas que seguirem o padrão de nomenclatura serão reconhecidas sem alteração no código ou na automação de pré-matrícula.

Depois de confirmar o recibo em modo seguro, altere `KOMMO_SYNC_ENABLED` para `true` e faça um novo deploy.

Endpoint de saúde: `GET /api/health`.

## Desenvolvimento

```bash
npm install
npm test
npm run lint
npm run build
```
