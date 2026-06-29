const ADMIN_TOKEN_KEY = "zen_admin_token";
const ADMIN_REFRESH_TOKEN_KEY = "zen_admin_refresh_token";
const ADMIN_USER_KEY = "zen_admin_user";

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);
export const getAdminRefreshToken = () =>
  localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY);

export const getAdminUser = () => {
  const raw = localStorage.getItem(ADMIN_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAdminSession = ({
  token,
  access_token,
  refresh_token,
  user
}) => {
  const accessToken = access_token || token;
  if (accessToken) localStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
  if (refresh_token)
    localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refresh_token);
  if (user) localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
};

export const buildAdminAuthHeaders = (extraHeaders = {}) => {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

export const tryRefreshAdminAccessToken = async (backendUrl) => {
  const refreshToken = getAdminRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${backendUrl}/api/admin/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${refreshToken}`
    }
  });

  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.access_token) return null;

  localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
  return data.access_token;
};

export const authFetch = async (backendUrl, path, options = {}) => {
  const { headers = {}, ...rest } = options;

  let response = await fetch(`${backendUrl}${path}`, {
    ...rest,
    headers: buildAdminAuthHeaders(headers)
  });

  if (response.status !== 401 && response.status !== 422) {
    return response;
  }

  const refreshedToken = await tryRefreshAdminAccessToken(backendUrl);
  if (!refreshedToken) return response;

  response = await fetch(`${backendUrl}${path}`, {
    ...rest,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${refreshedToken}`
    }
  });

  return response;
};
