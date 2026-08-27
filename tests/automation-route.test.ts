import { afterEach, describe, expect, it } from "vitest";
import { routeForConversion } from "../src/config/products";
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
    process.env.KOMMO_CURITIBA_ENTRY_STAGE_NAME = "Novos leads";
    expect(routeForConversion(conversion("Curitiba"))).toMatchObject({
      product: "Pré-matrícula",
      pipelineName: "Funil Curitiba",
      stageName: "Novos leads",
      tags: ["RD", "Site", "Pré-matrícula"],
    });
  });

  it("envia Cascavel e demais unidades para o Funil Filiais", () => {
    process.env.KOMMO_FILIAIS_ENTRY_STAGE_NAME = "Novos leads";
    expect(routeForConversion(conversion("Cascavel"))).toMatchObject({
      pipelineName: "Funil Filiais",
      stageName: "Novos leads",
      leadName: "Pré-matrícula | Reabilitação Neurofuncional Adulto: avaliação e tratamento | Rodrigo Bueno",
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
});
