const sanitizeBaseUrl = (url) => (url || "").trim().replace(/\/$/, "");

const buildCodespacesBackendUrl = () => {
  const { protocol, hostname } = window.location;
  const match = hostname.match(
    /^(.*)-\d+\.(app\.github\.dev|githubpreview\.dev)$/,
  );
  if (!match) return "";
  const [, prefix, domain] = match;
  return `${protocol}//${prefix}-3001.${domain}`;
};

export const resolveBackendUrl = () => {
  const envUrl = sanitizeBaseUrl(import.meta.env.VITE_BACKEND_URL);
  const hostname = window.location.hostname;
  const isCodespacesHost = /app\.github\.dev$|githubpreview\.dev$/.test(
    hostname,
  );
  const envPointsToLocal = /localhost|127\.0\.0\.1/.test(envUrl);

  if (isCodespacesHost && (!envUrl || envPointsToLocal)) {
    const codespacesUrl = buildCodespacesBackendUrl();
    if (codespacesUrl) return codespacesUrl;
  }

  if (envUrl) return envUrl;

  const { protocol } = window.location;
  return `${protocol}//localhost:3001`;
};
