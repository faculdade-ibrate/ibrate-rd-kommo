import { describe, expect, it } from "vitest";
import { normalizeBrazilPhone, normalizeText } from "../src/lib/normalize";

describe("normalização", () => {
  it("normaliza celular brasileiro para E.164", () => {
    expect(normalizeBrazilPhone("(41) 98879-7301")).toBe("+5541988797301");
  });

  it("preserva telefone brasileiro já internacional", () => {
    expect(normalizeBrazilPhone("+55 41 98879-7301")).toBe("+5541988797301");
  });

  it("normaliza textos para comparação de campos", () => {
    expect(normalizeText("Quantas unidades possui?")).toBe("quantas unidades possui");
  });
});
