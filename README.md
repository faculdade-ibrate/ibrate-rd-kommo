# Faculdade Ibrate · RD Station → Kommo

Aplicação independente que recebe conversões do **Formulário de Pré-matrícula** e das **Agendas de Cursos** do RD Station e cria ou atualiza o contato e a oportunidade na conta `ibrate.kommo.com`.

## Regras atuais

- Evento RD: `Formulário de Pré-matrícula`.
- Rota de automação: `pre-matricula`.
- Canal automático das agendas: identificadores iniciados por `agenda-de-cursos-`.
- A cidade é extraída de formatos como `agenda-de-cursos-em-cascavel` e `agenda-de-cursos-curitiba`.
- `Curitiba` → `Funil Curitiba` → `NOVOS LEADS RD`.
- `Chapecó`, `Balneário Camboriú` e `Joinville` → `Funil Santa Catarina` → `NOVOS LEADS RD`.
- `Cascavel` e `Londrina` → `Funil Interior do PR` → `NOVOS LEADS RD`.
- `Equilibra (CWB)` e cidades ainda não configuradas são ignoradas com o motivo registrado no log.
- O contato é localizado por telefone ou e-mail. Uma oportunidade aberta só é atualizada quando também pertence à mesma unidade; outra cidade cria uma nova oportunidade, mesmo dentro do mesmo funil regional.
- Nome da oportunidade: `Pré-matrícula | Curso | Nome`.
- Campos personalizados da oportunidade: `Curso`, `Unidade`, `Data do Curso` e `Formação`.
- Nas LPs de agenda, `curso_de_interesse` é gravado como `Curso`; `Unidade` é derivada do identificador e `Data do Curso` fica vazia quando não existir no formulário.
- Tags: `RD`, `Site` e `Pré-matrícula`.
- Nas agendas, as únicas tags enviadas são `Pré-matrícula` e `Agenda de Cursos`.

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
- `KOMMO_SYNC_ENABLED=false`: modo seguro para validar o payload sem gravar na Kommo.

Os nomes dos funis já possuem os padrões `Funil Curitiba` e `Funil Filiais`, mas também podem ser alterados pelas variáveis correspondentes.

## Webhook

Para o fluxo de automação **Enviar Leads para Integração** do RD:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd/pre-matricula/SEU_SEGREDO
```

Para uma automação que reúne várias LPs de agenda, use na ação **Enviar Leads para Integração**:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd/agendas/SEU_SEGREDO
```

Nesse formato, a aplicação lê o identificador da última conversão dentro do payload da automação e extrai a cidade. Ao incluir uma nova LP como entrada dessa automação, ela será reconhecida automaticamente se o identificador seguir o padrão `agenda-de-cursos-[cidade]` ou `agenda-de-cursos-em-[cidade]`.

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
