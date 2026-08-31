import { afterEach, describe, expect, it } from "vitest";
import { isAgendaEvent, isEquilibraEvent, routeForConversion } from "../src/config/products";
import type { ParsedRdConversion } from "../src/lib/rd";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function conversion(unit: string, eventIdentifier = "Formulário de Pré-matrícula"): ParsedRdConversion {
  return {
    eventIdentifier,
    name: "Rodrigo Bueno",
    email: "rodrigo@updo.com.br",
    phone: "+5541988797301",
    customFields: {
      cf_formacao: "Formação superior completa",
      cf_data_do_curso: "12/09/2026",
      cf_unidade: unit,
      cf_curso: "Reabilitação Neurofuncional Adulto: avaliação e tratamento",
    },
    rawKeys: [],
  };
}

describe("roteamento da pré-matrícula Ibrate", () => {
  it("envia Curitiba para o Funil Curitiba", () => {
    expect(routeForConversion(conversion("Curitiba"))).toMatchObject({
      product: "Pré-matrícula",
      pipelineName: "Funil Curitiba",
      stageName: "NOVOS LEADS RD",
      tags: ["RD", "Site", "Pré-matrícula"],
    });
  });

  it("envia Cascavel para o Funil Interior do PR", () => {
    expect(routeForConversion(conversion("Cascavel"))).toMatchObject({
      pipelineName: "Funil Interior do PR",
      stageName: "NOVOS LEADS RD",
      leadName: "Reabilitação Neurofuncional Adulto: avaliação e tratamento | Cascavel",
    });
  });

  it.each(["Chapecó", "Balneário Camboriú", "Joinville"])(
    "envia %s para o Funil Santa Catarina",
    (unit) => {
      expect(routeForConversion(conversion(unit))).toMatchObject({
        pipelineName: "Funil Santa Catarina",
        stageName: "NOVOS LEADS RD",
      });
    },
  );

  it.each(["Cascavel", "Londrina"])("envia %s para o Funil Interior do PR", (unit) => {
    expect(routeForConversion(conversion(unit))).toMatchObject({
      pipelineName: "Funil Interior do PR",
      stageName: "NOVOS LEADS RD",
    });
  });

  it("envia Equilibra para seu próprio funil e ignora unidades ainda não configuradas", () => {
    expect(routeForConversion(conversion("Equilibra (CWB)"))).toMatchObject({
      pipelineName: "Funil Equilibra",
      stageName: "NOVOS LEADS RD",
    });
    expect(routeForConversion(conversion("Nova unidade"))).toEqual({
      ignoredReason: "Unidade sem funil configurado: Nova unidade",
    });
  });

  it("aceita a rota curta usada pelo fluxo de automação do RD", () => {
    expect(routeForConversion(conversion("Londrina", "pre-matricula"))).toBeDefined();
  });

  it("roteia whatsapp-site pela unidade atual e ignora os dados históricos da RD", () => {
    const whatsapp = conversion("Unidade antiga", "whatsapp-site");
    whatsapp.customFields = {
      Curso: "Curso antigo",
      Unidade: "Unidade antiga",
      "Data do Curso": "12/09/2026",
      "Qual curso você está buscando?": "Acupuntura",
      "Unidade da sua escolha": "Equilibra (Curitiba)",
    };

    expect(routeForConversion(whatsapp)).toMatchObject({
      product: "WhatsApp Site",
      source: "Site",
      pipelineName: "Funil Equilibra",
      stageName: "NOVOS LEADS RD",
      leadName: "Acupuntura | Equilibra (Curitiba)",
      tags: ["RD", "Site", "WhatsApp"],
      derivedCustomFields: {
        Curso: "Acupuntura",
        Unidade: "Equilibra (Curitiba)",
      },
      clearCustomFields: ["Data do Curso"],
    });
  });

  it("mantém as cidades do whatsapp-site nos funis regionais", () => {
    const whatsapp = conversion("", "whatsapp-site");
    whatsapp.customFields = {
      "Qual curso você está buscando?": "Acupuntura",
      "Unidade da sua escolha": "Curitiba",
    };

    expect(routeForConversion(whatsapp)).toMatchObject({
      pipelineName: "Funil Curitiba",
      leadName: "Acupuntura | Curitiba",
    });
  });

  it("envia Pré inscrição cursos para a Equilibra e ignora Mensagem", () => {
    const preRegistration = conversion("Unidade antiga", "pre-inscricao-cursos");
    preRegistration.customFields = {
      Mensagem: "Boa tarde. Gostaria de mais informações sobre o curso.",
      "Título da página": "Pós-Graduação e MBA em Cosmetologia e Inovação de Cosméticos",
      "Curso de Interesse": "Pós-Graduação e MBA em Cosmetologia e Inovação de Cosméticos",
      "Data do Curso": "12/09/2026",
      Formação: "Formação antiga",
    };

    expect(routeForConversion(preRegistration)).toMatchObject({
      product: "Pré-inscrição Equilibra",
      source: "Site",
      pipelineName: "Funil Equilibra",
      stageName: "NOVOS LEADS RD",
      leadName: "Pós-Graduação e MBA em Cosmetologia e Inovação de Cosméticos | Equilibra (Curitiba)",
      tags: ["RD", "Site", "Pré-inscrição", "Equilibra"],
      derivedCustomFields: {
        Curso: "Pós-Graduação e MBA em Cosmetologia e Inovação de Cosméticos",
        Unidade: "Equilibra (Curitiba)",
      },
      clearCustomFields: ["Data do Curso"],
      customFieldNames: ["Curso de Interesse"],
    });
  });

  it.each([
    ["pre-inscricao-equilibra", "Pré-inscrição Equilibra", ["RD", "Site", "Pré-inscrição", "Equilibra"]],
    ["contato-equilibra", "Contato Equilibra", ["RD", "Site", "Contato", "Equilibra"]],
    ["Contato Equiliba", "Contato Equilibra", ["RD", "Site", "Contato", "Equilibra"]],
  ])("envia %s com Mensagem para o Funil Equilibra", (eventIdentifier, title, tags) => {
    const contact = conversion("Unidade antiga", eventIdentifier);
    contact.customFields = {
      Mensagem: "Olá",
      Curso: "Curso histórico",
      Unidade: "Unidade histórica",
      "Data do Curso": "12/09/2026",
    };

    expect(routeForConversion(contact)).toMatchObject({
      product: title,
      source: "Site",
      pipelineName: "Funil Equilibra",
      stageName: "NOVOS LEADS RD",
      leadName: `${title} | Equilibra (Curitiba)`,
      tags,
      derivedCustomFields: {
        Unidade: "Equilibra (Curitiba)",
      },
      clearCustomFields: ["Data do Curso"],
      customFieldNames: ["Mensagem"],
    });
  });

  it("envia whatsapp-site-equilibra com unidade fixa para a Equilibra", () => {
    const whatsapp = conversion("Unidade histórica", "whatsapp-site-equilibra");
    whatsapp.customFields = {
      Curso: "Curso histórico",
      Unidade: "Unidade histórica",
      "Data do Curso": "12/09/2026",
      "Qual curso você está buscando?": "Acupuntura",
    };

    expect(routeForConversion(whatsapp)).toMatchObject({
      product: "WhatsApp Equilibra",
      source: "Site",
      pipelineName: "Funil Equilibra",
      stageName: "NOVOS LEADS RD",
      leadName: "Acupuntura | Equilibra (Curitiba)",
      tags: ["RD", "Site", "WhatsApp", "Equilibra"],
      derivedCustomFields: {
        Curso: "Acupuntura",
        Unidade: "Equilibra (Curitiba)",
      },
      clearCustomFields: ["Data do Curso"],
      customFieldNames: ["Qual curso você está buscando?"],
    });
  });

  it("ignora outros formulários", () => {
    expect(routeForConversion(conversion("Curitiba", "Outro formulário"))).toBeUndefined();
  });

  it("recusa pré-matrícula sem unidade", () => {
    expect(() => routeForConversion(conversion(""))).toThrow("sem Unidade");
  });

  it("extrai Cascavel da agenda e envia para o Funil Interior do PR", () => {
    const agenda = conversion("Unidade antiga", "agenda-de-cursos-em-cascavel");
    agenda.customFields = {
      cf_curso: "Curso antigo",
      cf_unidade: "Unidade antiga",
      cf_curso_de_interesse: "Fisioterapia Respiratória",
      cf_formacao: "Formação superior completa",
    };

    expect(routeForConversion(agenda)).toMatchObject({
      source: "Landing Page",
      pipelineName: "Funil Interior do PR",
      stageName: "NOVOS LEADS RD",
      leadName: "Fisioterapia Respiratória | Cascavel",
      tags: ["Pré-matrícula", "Agenda de Cursos"],
      derivedCustomFields: {
        Curso: "Fisioterapia Respiratória",
        Unidade: "Cascavel",
      },
      clearCustomFields: ["Data do Curso"],
    });
  });

  it("aceita agenda sem 'em' e envia Curitiba para seu funil", () => {
    const route = routeForConversion(conversion("", "agenda-de-cursos-curitiba"));
    expect(route).toMatchObject({
      pipelineName: "Funil Curitiba",
      derivedCustomFields: { Unidade: "Curitiba" },
    });
  });

  it("reconhece a agenda de pós de Curitiba", () => {
    expect(routeForConversion(conversion("", "agenda-de-pos-em-curitiba"))).toMatchObject({
      pipelineName: "Funil Curitiba",
      derivedCustomFields: { Unidade: "Curitiba" },
    });
  });

  it("envia a agenda da Equilibra para seu funil", () => {
    expect(routeForConversion(conversion("", "agenda-de-cursos-equilibra"))).toMatchObject({
      pipelineName: "Funil Equilibra",
      stageName: "NOVOS LEADS RD",
      derivedCustomFields: { Unidade: "Equilibra (CWB)" },
    });
  });

  it("reconhece apenas identificadores de agenda válidos", () => {
    expect(isAgendaEvent("agenda-de-cursos-em-londrina")).toBe(true);
    expect(isAgendaEvent("agenda-de-cursos-sao-jose-dos-pinhais")).toBe(true);
    expect(isAgendaEvent("agenda-de-pos-em-curitiba")).toBe(true);
    expect(isAgendaEvent("Formulário de Pré-matrícula")).toBe(false);
  });

  it.each([
    "Pré inscrição cursos",
    "Pré inscrição Equilibra",
    "Contato Equiliba",
    "whatsapp-site-equilibra",
    "agenda-de-cursos-equilibra",
  ])("reconhece %s no canal agrupado da Equilibra", (eventIdentifier) => {
    expect(isEquilibraEvent(eventIdentifier)).toBe(true);
  });

  it("rejeita eventos da Ibrate no canal agrupado da Equilibra", () => {
    expect(isEquilibraEvent("whatsapp-site")).toBe(false);
    expect(isEquilibraEvent("agenda-de-cursos-em-cascavel")).toBe(false);
  });
});
