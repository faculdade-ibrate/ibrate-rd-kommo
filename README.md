# Faculdade Ibrate · RD Station → Kommo

Aplicação independente que recebe conversões do **Formulário de Pré-matrícula**, do **WhatsApp do site**, da **Pré inscrição cursos** da Equilibra e das **Agendas de Cursos** do RD Station e cria ou atualiza o contato e a oportunidade na conta `ibrate.kommo.com`.

## Regras atuais

- Evento RD: `Formulário de Pré-matrícula`.
- Evento RD do WhatsApp: `whatsapp-site`.
- Evento RD da Equilibra: `Pré inscrição cursos` (rota `pre-inscricao-cursos`).
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
- Na `Pré inscrição cursos`, `Curso de Interesse` é gravado como `Curso`, a unidade é fixada como `Equilibra (Curitiba)` e `Mensagem` é ignorada.
- Tags: `RD`, `Site` e `Pré-matrícula`.
- Nas agendas, as únicas tags enviadas são `Pré-matrícula` e `Agenda de Cursos`.
- No `whatsapp-site`, as tags enviadas são `RD`, `Site` e `WhatsApp`.
- Na `Pré inscrição cursos`, as tags enviadas são `RD`, `Site`, `Pré-inscrição` e `Equilibra`.

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

Para a automação separada da Equilibra, com entrada no formulário **Pré inscrição cursos**, use:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd/pre-inscricao-cursos/SEU_SEGREDO
```

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
