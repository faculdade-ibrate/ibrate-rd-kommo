import { normalizeText, phoneDigits } from "@/lib/normalize";
import type { KommoCompany, KommoContact, KommoCustomField, KommoFieldValue, KommoLead } from "@/lib/kommo-types";

type Collection<T> = { _embedded?: Record<string, T[]> };
type Pipeline = { id: number; name: string; _embedded?: { statuses?: Array<{ id: number; name: string }> } };
type EntityLink = { to_entity_id: number; to_entity_type: string };

export class KommoError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: unknown,
    public readonly operation?: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export class KommoClient {
  private readonly baseUrl: string;

  constructor(private readonly token: string, subdomain: string) {
    this.baseUrl = `https://${subdomain}.kommo.com/api/v4`;
  }

  private async request<T>(path: string, init: RequestInit = {}, attempt = 0, operation = "processar requisição"): Promise<T | null> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });

    if (response.status === 204) return null;
    if (response.status === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      return this.request<T>(path, init, attempt + 1, operation);
    }

    const text = await response.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) {
      throw new KommoError(
        `Kommo recusou ${operation} (HTTP ${response.status}).`,
        response.status,
        data,
        operation,
      );
    }
    return data as T;
  }

  async resolvePipeline(pipelineName: string, stageName: string) {
    const data = await this.request<Collection<Pipeline>>("/leads/pipelines", {}, 0, "consultar funis");
    const pipelines = data?._embedded?.pipelines ?? [];
    const pipeline = pipelines.find((item) => normalizeText(item.name) === normalizeText(pipelineName));
    if (!pipeline) throw new Error(`Funil da Kommo não encontrado: ${pipelineName}`);
    const stage = pipeline._embedded?.statuses?.find((item) => normalizeText(item.name) === normalizeText(stageName));
    if (!stage) throw new Error(`Etapa da Kommo não encontrada em ${pipeline.name}: ${stageName}`);
    return { pipelineId: pipeline.id, statusId: stage.id };
  }

  async getCustomFields(entity: "leads" | "contacts"): Promise<KommoCustomField[]> {
    const data = await this.request<Collection<KommoCustomField>>(`/${entity}/custom_fields?limit=250`, {}, 0, `consultar campos de ${entity}`);
    return data?._embedded?.custom_fields ?? [];
  }

  async findContact(phone?: string, email?: string): Promise<KommoContact | undefined> {
    for (const query of [phone, email].filter(Boolean) as string[]) {
      const data = await this.request<Collection<KommoContact>>(`/contacts?with=leads&limit=50&query=${encodeURIComponent(query)}`, {}, 0, "localizar contato");
      const contacts = data?._embedded?.contacts ?? [];
      const exact = contacts.find((contact) => contactMatches(contact, phone, email));
      if (exact) return exact;
    }
    return undefined;
  }

  async createContact(name: string, phone?: string, email?: string): Promise<KommoContact> {
    const customFields = contactFieldValues(phone, email);
    const data = await this.request<Collection<KommoContact>>("/contacts", {
      method: "POST",
      body: JSON.stringify([{ name, custom_fields_values: customFields }]),
    }, 0, "criar contato");
    const contact = data?._embedded?.contacts?.[0];
    if (!contact) throw new Error("A Kommo não retornou o contato criado.");
    return contact;
  }

  async updateContact(id: number, name: string, phone?: string, email?: string): Promise<void> {
    await this.request(`/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, custom_fields_values: contactFieldValues(phone, email) }),
    }, 0, "atualizar contato");
  }

  async findOrCreateCompany(name: string): Promise<KommoCompany> {
    const normalizedName = normalizeText(name);
    const data = await this.request<Collection<KommoCompany>>(
      `/companies?limit=50&filter[name][]=${encodeURIComponent(name)}`,
      {},
      0,
      "localizar empresa",
    );
    const existing = (data?._embedded?.companies ?? [])
      .find((company) => normalizeText(company.name) === normalizedName);
    if (existing) return existing;

    const created = await this.request<Collection<KommoCompany>>("/companies", {
      method: "POST",
      body: JSON.stringify([{ name }]),
    }, 0, "criar empresa");
    const company = created?._embedded?.companies?.[0];
    if (!company) throw new Error("A Kommo não retornou a empresa criada.");
    return company;
  }

  async ensureCompanyLink(entity: "contacts" | "leads", entityId: number, companyId: number): Promise<void> {
    const data = await this.request<Collection<EntityLink>>(
      `/${entity}/${entityId}/links?filter[to_entity_type]=companies&filter[to_entity_id]=${companyId}`,
      {},
      0,
      "consultar vínculo com empresa",
    );
    const linked = (data?._embedded?.links ?? [])
      .some((link) => link.to_entity_type === "companies" && link.to_entity_id === companyId);
    if (linked) return;

    await this.request(`/${entity}/${entityId}/link`, {
      method: "POST",
      body: JSON.stringify([{ to_entity_id: companyId, to_entity_type: "companies" }]),
    }, 0, "vincular empresa");
  }

  async getLead(id: number): Promise<KommoLead | null> {
    return this.request<KommoLead>(`/leads/${id}`, {}, 0, "consultar oportunidade");
  }

  async findOpenProductLead(
    contact: KommoContact,
    pipelineId: number,
  ): Promise<KommoLead | undefined> {
    const ids = contact._embedded?.leads?.map((lead) => lead.id) ?? [];
    for (const id of ids.slice(-25).reverse()) {
      const lead = await this.getLead(id);
      if (
        lead
        && lead.pipeline_id === pipelineId
        && !lead.closed_at
      ) {
        return lead;
      }
    }
    return undefined;
  }

  async createLead(input: {
    name: string;
    pipelineId: number;
    statusId: number;
    contactId: number;
    companyId?: number;
    tags: string[];
    customFields: KommoFieldValue[];
  }): Promise<KommoLead> {
    let data: Collection<KommoLead> | null;
    try {
      data = await this.request<Collection<KommoLead>>("/leads", {
        method: "POST",
        body: JSON.stringify([{
          name: input.name,
          pipeline_id: input.pipelineId,
          status_id: input.statusId,
          custom_fields_values: input.customFields,
          _embedded: {
            contacts: [{ id: input.contactId, is_main: true }],
            ...(input.companyId ? { companies: [{ id: input.companyId }] } : {}),
            tags: input.tags.map((name) => ({ name })),
          },
        }]),
      }, 0, "criar oportunidade");
    } catch (error) {
      if (error instanceof KommoError) {
        throw new KommoError(error.message, error.status, error.detail, error.operation, {
          customFields: input.customFields.map((field, index) => ({ index, fieldId: field.field_id ?? field.field_code })),
        });
      }
      throw error;
    }
    const lead = data?._embedded?.leads?.[0];
    if (!lead) throw new Error("A Kommo não retornou a oportunidade criada.");
    return lead;
  }

  async updateLead(
    id: number,
    name: string,
    statusId: number,
    customFields: KommoFieldValue[],
    tags: string[],
    tagsToDelete: string[] = ["RD"],
  ): Promise<void> {
    await this.request(`/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        status_id: statusId,
        custom_fields_values: customFields,
        _embedded: {
          tags_to_add: tags.map((name) => ({ name })),
          tags_to_delete: tagsToDelete.map((name) => ({ name })),
        },
      }),
    }, 0, "atualizar oportunidade");
  }
}

export function safeKommoErrorDetail(detail: unknown): unknown {
  if (!detail || typeof detail !== "object") return undefined;

  const allowedKeys = new Set([
    "title", "type", "status", "detail", "code", "path", "request_id",
    "validation-errors", "errors",
  ]);

  const filter = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(filter);
    if (!value || typeof value !== "object") return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => allowedKeys.has(key))
        .map(([key, child]) => [key, filter(child)]),
    );
  };

  return filter(detail);
}

function contactFieldValues(phone?: string, email?: string): KommoFieldValue[] {
  const values: KommoFieldValue[] = [];
  if (phone) values.push({ field_code: "PHONE", values: [{ value: phone, enum_code: "MOB" }] });
  if (email) values.push({ field_code: "EMAIL", values: [{ value: email, enum_code: "WORK" }] });
  return values;
}

function contactMatches(contact: KommoContact, phone?: string, email?: string): boolean {
  for (const field of contact.custom_fields_values ?? []) {
    for (const item of field.values ?? []) {
      if (field.field_code === "PHONE" && phone && phoneDigits(item.value) === phoneDigits(phone)) return true;
      if (field.field_code === "EMAIL" && email && String(item.value).trim().toLowerCase() === email.toLowerCase()) return true;
    }
  }
  return false;
}
