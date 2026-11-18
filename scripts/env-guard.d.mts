export const ALLOWED_PUBLIC_VARS: string[];
export function looksSecret(value: string): boolean;
export function jwtRole(value: string): string | null;
export function findPublicEnvProblems(env: Record<string, string | undefined>): string[];
export function assertNoSecretsInPublicEnv(env: Record<string, string | undefined>): void;
export function mask(v: string): string;
