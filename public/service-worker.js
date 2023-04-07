// to immediately install the service worker
addEventListener("install", (event) => {
  // install on all site tabs without waiting for them to be opened
  skipWaiting();
});

// to immediately activate the service worker
addEventListener("activate", (event) => {
  // activate on all tabs without waiting for them to be opened
  event.waitUntil(clients.claim());
});

const tokenExpirationStore = new Map();
const refreshTokenStore = new Map();
const tokenStore = new Map();
const configStore = new Map();

self.addEventListener("message", (event) => {
  console.log("new message received in worker:", event.data);

  const type = event.data.type;

  switch (type) {
    case "storeConfig":
      configStore.set(event.data.config.origin, event.data.config);
      break;
    default:
      console.log("type:", type, "not handled");
  }
});

function refreshToken(configItem) {
  const refreshToken = refreshTokenStore.get(configItem.origin);

  const headers = new Headers();
  headers.set("Content-Type", "application/x-www-form-urlencoded");
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);

  return fetch(configItem.token_endpoint, {
    method: "POST",
    headers,
    body,
  });
}

function createHeaders(headers, accessToken) {
  const newHeaders = new Headers(headers);
  if (!newHeaders.has("Authorization")) {
    newHeaders.set("Authorization", `Bearer ${accessToken}`);
  }
  return newHeaders;
}

async function handleTokenResponse(response, configItem) {
  const { access_token, refresh_token, expires_in } = await response.json();

  tokenStore.set(configItem.origin, access_token);
  refreshTokenStore.set(configItem.origin, refresh_token);
  tokenExpirationStore.set(configItem.origin, {
    expires_in,
    date: Date.now(),
  });
}

// to intercept the request and add the access token to the Authorization header when hitting the protected resource URL.
async function attachBearerToken(request, _clientId) {
  const { origin } = new URL(request.url);

  const configItem = configStore.get(origin);
  if (!configItem || configItem.token_endpoint === request.url) {
    return request;
  }

  if (tokenStore.get(configItem.origin)) {
    const { expires_in, date } = tokenExpirationStore.get(configItem.origin);

    if (Date.now() - date > expires_in) {
      try {
        const response = await refreshToken(configItem);
        await handleTokenResponse(response, configItem);
      } catch (e) {
        console.err(
          "Something went wrong while trying to refetch the access token:",
          e
        );
      }
    }

    const headers = createHeaders(
      request.headers,
      tokenStore.get(configItem.origin)
    );

    return new Request(request, { headers });
  } else {
    return request;
  }
}

function isTokenEndpoint(url) {
  for (const [_, value] of configStore) {
    if (value.token_endpoint === url) {
      return value;
    }
  }
}

const modifyResponse = async (response) => {
  const url = response.url;
  const configItem = isTokenEndpoint(url);

  if (!configItem) {
    return response;
  }

  await handleTokenResponse(response, configItem);

  return new Response({
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
};

async function fetchWithBearerToken({ request, clientId }) {
  const newRequest =
    request instanceof Request ? request : new Request(request);
  const attachBearerTokenFn = await attachBearerToken(newRequest, clientId);
  return fetch(attachBearerTokenFn).then(modifyResponse);
}

addEventListener("fetch", (event) => {
  event.respondWith(fetchWithBearerToken(event));
});
