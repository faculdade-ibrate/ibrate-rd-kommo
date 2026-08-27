import { describe, expect, it } from "vitest";
import { parseRdWebhook, sanitizedReceipt, unwrapRdAutomationPayload } from "../src/lib/rd";

describe("payload do RD", () => {
  it("extrai contato e campos personalizados sem expor valores no recibo", () => {
    const parsed = parseRdWebhook({
      event_type: "WEBHOOK.CONVERTED",
      event_identifier: "Formulário de Pré-matrícula",
      event_timestamp: "2026-08-06T14:16:00-03:00",
      contact: {
        uuid: "uuid-teste",
        name: "Contato Teste",
        email: "TESTE@EXEMPLO.COM",
        mobile_phone: "(41) 98879-7301",
        cf_quantas_unidades_possui: "4 a 10",
      },
    });

    expect(parsed.email).toBe("teste@exemplo.com");
    expect(parsed.phone).toBe("+5541988797301");
    expect(parsed.customFields.cf_quantas_unidades_possui).toBe("4 a 10");
    expect(sanitizedReceipt(parsed)).not.toHaveProperty("email");
  });

  it("rejeita payload sem contato fora da validação HTTP", () => {
    expect(() => parseRdWebhook({ event_identifier: "evento" })).toThrow("sem o objeto contact");
  });

  it("extrai o nome da empresa do campo padrão ou dos aliases do formulário", () => {
    const parsed = parseRdWebhook({
      event_identifier: "Formulário de Pré-matrícula",
      contact: {
        name: "Contato Teste",
        email: "teste@exemplo.com",
        company_name: "Restaurante Exemplo",
      },
    });

    expect(parsed.company).toBe("Restaurante Exemplo");
    expect(parsed.customFields).not.toHaveProperty("company_name");
  });

  it("abre o envelope legado enviado pelos fluxos de automação", () => {
    const contact = unwrapRdAutomationPayload({
      leads: [{
        uuid: "uuid-automacao",
        name: "Contato Teste",
        email: "teste@exemplo.com",
        mobile_phone: "41988797301",
        custom_fields: { cf_quantas_unidades_possui: "4 a 10" },
        last_conversion: { source: "Tráfego Direto" },
      }],
    });
    const parsed = parseRdWebhook({ event_identifier: "pre-matricula", contact });
    expect(parsed.email).toBe("teste@exemplo.com");
    expect(parsed.phone).toBe("+5541988797301");
    expect(parsed.origin).toBe("Tráfego Direto");
    expect(parsed.customFields.cf_quantas_unidades_possui).toBe("4 a 10");
  });
});
