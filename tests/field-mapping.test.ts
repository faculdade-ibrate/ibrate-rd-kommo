import { describe, expect, it } from "vitest";
import { buildLeadCustomFields } from "../src/lib/field-mapping";

describe("mapeamento dos campos da pré-matrícula", () => {
  it("mapeia os quatro campos e interpreta a data brasileira", () => {
    const result = buildLeadCustomFields([
      { id: 1, name: "Curso", type: "text" },
      { id: 2, name: "Unidade", type: "text" },
      { id: 3, name: "Data do Curso", type: "date" },
      { id: 4, name: "Formação", type: "text" },
    ], {
      product: "Pré-matrícula",
      source: "Site",
      event: "Formulário de Pré-matrícula",
      custom: {
        cf_curso: "Reabilitação Neurofuncional Adulto: avaliação e tratamento",
        cf_unidade: "Cascavel",
        cf_data_do_curso: "12/09/2026",
        cf_formacao: "Formação superior completa",
      },
    });

    expect(result.fields).toContainEqual({
      field_id: 1,
      values: [{ value: "Reabilitação Neurofuncional Adulto: avaliação e tratamento" }],
    });
    expect(result.fields).toContainEqual({ field_id: 2, values: [{ value: "Cascavel" }] });
    expect(result.fields).toContainEqual({
      field_id: 3,
      values: [{ value: Date.UTC(2026, 8, 12) / 1000 }],
    });
    expect(result.fields).toContainEqual({
      field_id: 4,
      values: [{ value: "Formação superior completa" }],
    });
  });

  it("mapeia curso_de_interesse das LPs para o campo Curso", () => {
    const result = buildLeadCustomFields([
      { id: 1, name: "Curso", type: "text" },
      { id: 2, name: "Unidade", type: "text" },
      { id: 3, name: "Data do Curso", type: "date" },
    ], {
      product: "Pré-matrícula",
      source: "Landing Page",
      event: "agenda-de-cursos-em-cascavel",
      custom: {
        cf_curso_de_interesse: "Fisioterapia Respiratória",
        Unidade: "Cascavel",
        cf_data_do_curso: "12/09/2026",
      },
      clearCustomFields: ["Data do Curso"],
    });

    expect(result.fields).toContainEqual({ field_id: 1, values: [{ value: "Fisioterapia Respiratória" }] });
    expect(result.fields).toContainEqual({ field_id: 2, values: [{ value: "Cascavel" }] });
    expect(result.fields).not.toContainEqual(expect.objectContaining({ field_id: 3 }));
    expect(result.fieldsToClear).toEqual([{ field_id: 3, values: null }]);
  });
});
