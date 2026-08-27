export type KommoFieldValue = {
  field_id?: number;
  field_code?: string;
  values: Array<{ value: unknown; enum_id?: number; enum_code?: string }>;
};

export type KommoCustomField = {
  id: number;
  name: string;
  code?: string | null;
  type: string;
  enums?: Array<{ id: number; value: string; code?: string | null }> | null;
};

export type KommoLead = {
  id: number;
  name: string;
  pipeline_id: number;
  status_id: number;
  closed_at?: number | null;
  custom_fields_values?: KommoFieldValue[] | null;
};

export type KommoContact = {
  id: number;
  name: string;
  custom_fields_values?: KommoFieldValue[] | null;
  _embedded?: { leads?: Array<{ id: number }> };
};

export type KommoCompany = {
  id: number;
  name: string;
};
