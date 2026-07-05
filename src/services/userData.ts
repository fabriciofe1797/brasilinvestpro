import { getAuthenticatedClient } from './database';

const EDGE_FUNCTION_NAME = 'app-proxy';

/**
 * Busca multiplos dados do usuario pelo data_key
 * Retorna um mapa { data_key: data_value }
 */
export const getUserData = async (
  token: string,
  keys: string[]
): Promise<Record<string, unknown>> => {
  if (!keys.length) return {};
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'get_user_data', data_keys: keys },
  });
  if (error || !data?.ok) {
    const msg = error?.message || data?.error || 'invoke_failed';
    console.error('Failed to fetch user_data:', msg);
    return {};
  }
  return (data.data as Record<string, unknown>) || {};
};

/**
 * Salva multiplos itens no user_data (UPSERT)
 */
export const setUserData = async (
  token: string,
  items: Array<{ data_key: string; data_value: unknown }>
): Promise<boolean> => {
  if (!items.length) return true;
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'set_user_data', items },
  });
  if (error || !data?.ok) {
    const msg = error?.message || data?.error || 'invoke_failed';
    console.error('Failed to save user_data:', msg);
    return false;
  }
  return true;
};

/**
 * Helper: busca um unico valor pelo data_key
 */
export const getUserSetting = async <T = unknown>(
  token: string,
  key: string
): Promise<T | null> => {
  const data = await getUserData(token, [key]);
  return (data[key] as T) ?? null;
};

/**
 * Helper: salva um unico valor pelo data_key
 */
export const setUserSetting = async (
  token: string,
  key: string,
  value: unknown
): Promise<boolean> => {
  return setUserData(token, [{ data_key: key, data_value: value }]);
};
