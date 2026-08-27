import { describe, expect, it } from "vitest";
import { leadHasCustomFieldValue } from "../src/lib/kommo";
import type { KommoLead } from "../src/lib/kommo-types";

const lead: KommoLead = {
  id: 1,
  name: "Pré-matrícula | Curso | Contato",
  pipeline_id: 10,
  status_id: 20,
  custom_fields_values: [
    { field_id: 862744, values: [{ value: "Cascavel" }] },
  ],
};

describe("duplicidade de oportunidade por unidade", () => {
  it("reconhece a mesma unidade ignorando caixa e acento", () => {
    expect(leadHasCustomFieldValue(lead, 862744, "cascavel")).toBe(true);
  });

  it("não considera outra cidade como a mesma oportunidade", () => {
    expect(leadHasCustomFieldValue(lead, 862744, "Londrina")).toBe(false);
  });

  it("não reutiliza oportunidade sem o campo Unidade", () => {
    expect(leadHasCustomFieldValue({ ...lead, custom_fields_values: [] }, 862744, "Cascavel")).toBe(false);
  });
});
