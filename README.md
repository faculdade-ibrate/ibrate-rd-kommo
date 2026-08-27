# Faculdade Ibrate · RD Station → Kommo

Aplicação independente que recebe a conversão do **Formulário de Pré-matrícula** do RD Station e cria ou atualiza o contato e a oportunidade na conta `ibrate.kommo.com`.

## Regras atuais

- Evento RD: `Formulário de Pré-matrícula`.
- Rota de automação: `pre-matricula`.
- Unidade `Curitiba` → `Funil Curitiba`.
- Qualquer outra unidade → `Funil Filiais`.
- O contato é localizado por telefone ou e-mail para evitar duplicidade.
- Nome da oportunidade: `Pré-matrícula | Curso | Nome`.
- Campos personalizados da oportunidade: `Curso`, `Unidade`, `Data do Curso` e `Formação`.
- Tags: `RD`, `Site` e `Pré-matrícula`.

## Variáveis da Vercel

Copie os nomes de `.env.example` para o projeto da Ibrate na Vercel.

- `KOMMO_SUBDOMAIN=ibrate`
- `KOMMO_LONG_LIVED_TOKEN`: token de longa duração da conta Ibrate.
- `RD_WEBHOOK_SECRET`: segredo longo e exclusivo deste webhook.
- `KOMMO_CURITIBA_ENTRY_STAGE_NAME`: etapa inicial exata do Funil Curitiba.
- `KOMMO_FILIAIS_ENTRY_STAGE_NAME`: etapa inicial exata do Funil Filiais.
- `KOMMO_SYNC_ENABLED=false`: modo seguro para validar o payload sem gravar na Kommo.

Os nomes dos funis já possuem os padrões `Funil Curitiba` e `Funil Filiais`, mas também podem ser alterados pelas variáveis correspondentes.

## Webhook

Para o fluxo de automação **Enviar Leads para Integração** do RD:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd/pre-matricula/SEU_SEGREDO
```

Para o webhook padrão de conversão:

```text
https://SEU-PROJETO.vercel.app/api/webhooks/rd?secret=SEU_SEGREDO
```

Depois de confirmar o recibo em modo seguro, altere `KOMMO_SYNC_ENABLED` para `true` e faça um novo deploy.

Endpoint de saúde: `GET /api/health`.

## Desenvolvimento

```bash
npm install
npm test
npm run lint
npm run build
```
