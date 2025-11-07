import { Meta, UUID } from "./collections.models";

export interface EnvironmentDoc {
  meta: Meta;
  name: string;
  description?: string;
  vars: Record<string, string>;
  order: number;
}

export type EnvironmentId = UUID;

export interface EnvironmentExport {
  meta: Meta;
  environments: EnvironmentDoc[];
}
