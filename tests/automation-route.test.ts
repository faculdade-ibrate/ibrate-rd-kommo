import { afterEach, describe, expect, it } from "vitest";
import { isAgendaEvent, routeForConversion } from "../src/config/products";
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
      leadName: "Rodrigo Bueno | Reabilitação Neurofuncional Adulto: avaliação e tratamento | Cascavel",
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

  it("ignora Equilibra e unidades ainda não configuradas", () => {
    expect(routeForConversion(conversion("Equilibra (CWB)"))).toEqual({
      ignoredReason: "Unidade sem funil configurado: Equilibra (CWB)",
    });
    expect(routeForConversion(conversion("Nova unidade"))).toEqual({
      ignoredReason: "Unidade sem funil configurado: Nova unidade",
    });
  });

  it("aceita a rota curta usada pelo fluxo de automação do RD", () => {
    expect(routeForConversion(conversion("Londrina", "pre-matricula"))).toBeDefined();
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
      leadName: "Rodrigo Bueno | Fisioterapia Respiratória | Cascavel",
      tags: ["Pré-matrícula", "Agenda de Cursos"],
      derivedCustomFields: {
        Curso: "Fisioterapia Respiratória",
        Unidade: "Cascavel",
      },
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

  it("reconhece Equilibra, mas mantém sem funil por enquanto", () => {
    expect(routeForConversion(conversion("", "agenda-de-cursos-equilibra"))).toEqual({
      ignoredReason: "Unidade sem funil configurado: Equilibra (CWB)",
    });
  });

  it("reconhece apenas identificadores de agenda válidos", () => {
    expect(isAgendaEvent("agenda-de-cursos-em-londrina")).toBe(true);
    expect(isAgendaEvent("agenda-de-cursos-sao-jose-dos-pinhais")).toBe(true);
    expect(isAgendaEvent("agenda-de-pos-em-curitiba")).toBe(true);
    expect(isAgendaEvent("Formulário de Pré-matrícula")).toBe(false);
  });
});
