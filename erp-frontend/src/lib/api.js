const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

const resolvedBaseUrl = (() => {
  const envUrl = import.meta.env?.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const port = import.meta.env?.VITE_API_PORT || "8000";
    const defaultPort = port || (protocol === "https:" ? "443" : "8000");
    return `${protocol}//${hostname}:${defaultPort}`.replace(/\/$/, "");
  }

  return DEFAULT_BASE_URL;
})();

const baseUrl = resolvedBaseUrl;
// debug: log resolved base URL so we can see what the client will call
try {
  if (typeof console !== 'undefined' && console.debug) console.debug('API baseUrl resolved to', baseUrl);
} catch (e) {
  // ignore
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 8000);

  try {
    // attach Authorization header when token is present in localStorage
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('erp_access_token') : null;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}${path}` || "", {
      headers,
      signal: controller.signal,
      ...options,
    });

    if (!response.ok) {
      const contentType = response.headers.get("Content-Type") || "";
      let detail = response.statusText;

      if (contentType.includes("application/json")) {
        const payload = await response.json().catch(() => null);
        detail = payload?.detail || detail;
      } else {
        detail = await response.text().catch(() => detail);
      }

      const err = new Error(detail || `Request failed with status ${response.status}`);
      // attach HTTP status for callers that want to specialize behavior
      err.status = response.status;
      throw err;
    }

    const isJson = (response.headers.get("Content-Type") || "").includes(
      "application/json"
    );
    return isJson ? response.json() : response.text();
  } catch (err) {
    // Normalize aborts/timeouts to a clear error message so UI can show user-friendly text
    if (err && (err.name === "AbortError" || err.code === "ABORT_ERR")) {
      const timeoutErr = new Error("Requisição expirada (timeout). Tente novamente mais tarde.");
      timeoutErr.code = "ETIMEOUT";
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchProducts() {
  return request("/products");
}

export function fetchProductsReport(params = {}) {
  const qs = new URLSearchParams();
  if (params.from_date) qs.append('from_date', params.from_date);
  if (params.to_date) qs.append('to_date', params.to_date);
  if (params.sku) qs.append('sku', params.sku);
  if (params.name) qs.append('name', params.name);
  if (params.category) qs.append('category', params.category);
  if (params.skip) qs.append('skip', String(params.skip));
  if (params.limit) qs.append('limit', String(params.limit));
  const path = `/reports/products${qs.toString() ? `?${qs.toString()}` : ''}`;
  return request(path, { timeout: 15000 });
}

export function fetchCustomers() {
  return request("/customers");
}

export function fetchCustomer(id) {
  return request(`/customers/${id}`);
}

export function createCustomerPayment(payload) {
  return request(`/customer-payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// helper: search customers client-side by substring (the app loads customers on startup)
export function searchCustomersLocal(customers, query) {
  if (!query) return customers;
  const q = String(query).toLowerCase();
  return customers.filter((c) => (c.name || "").toLowerCase().includes(q));
}

export function fetchSales() {
  return request("/sales");
}


export function fetchFinancialEntries() {
  return request("/financial-entries");
}

export function fetchCategories() {
  return request("/categories");
}

export function createCategory(payload) {
  return request("/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchExpenses() {
  return request("/financial-entries?type=despesa");
}

export function createExpense(payload) {
  return request("/financial-entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExpense(id, payload) {
  return request(`/financial-entries/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteExpense(id) {
  return request(`/financial-entries/${id}`, {
    method: "DELETE",
  });
}

export function createFinancialEntry(payload) {
  return request("/financial-entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchCashboxes() {
  return request('/cashboxes');
}

export function fetchCashboxReport(id) {
  return request(`/cashboxes/${id}/report`);
}

export function createCashbox(payload) {
  return request('/cashboxes', { method: 'POST', body: JSON.stringify(payload) });
}

export function openCashbox(id) {
  return request(`/cashboxes/${id}/open`, { method: 'POST' });
}

export function closeCashbox(id, payload) {
  return request(`/cashboxes/${id}/close`, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateFinancialEntry(id, payload) {
  return request(`/financial-entries/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteFinancialEntry(id) {
  return request(`/financial-entries/${id}`, {
    method: "DELETE",
  });
}

export function createCustomer(payload) {
  return request("/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createSale(payload) {
  return request("/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function cancelSale(id) {
  return request(`/sales/${id}/cancel`, {
    method: "POST",
  });
}

export function resolveMediaUrl(path = "") {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createProduct(payload) {
  return request("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id, payload) {
  return request(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadProductPhotos(id, files) {
  if (!files?.length) {
    return null;
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${baseUrl}/products/${id}/photos`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Falha ao enviar fotos");
  }

  return response.json();
}

export function deleteProductPhoto(id, publicPath) {
  // publicPath should be the same string returned by backend (e.g. /media/products/xxx.webp)
  const encoded = encodeURIComponent(publicPath);
  return request(`/products/${id}/photos?path=${encoded}`, {
    method: 'DELETE',
  });
}

// --- Authentication helpers ---
export async function login(username, password) {
  const payload = { username, password };
  const resp = await request('/auth/token', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  // resp expected { access_token, token_type }
  if (resp && resp.access_token) {
    try {
      window.localStorage.setItem('erp_access_token', resp.access_token);
    } catch (err) {
      // ignore localStorage failures
    }
  }
  return resp;
}

export function logout() {
  try {
    window.localStorage.removeItem('erp_access_token');
  } catch (err) {
    // ignore
  }
}

export function fetchCurrentUser() {
  return request('/auth/me');
}

export function signup(email, password) {
  const payload = { email, password };
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createRegistration(payload) {
  return request('/registrations', {
    method: 'POST',
    body: JSON.stringify(payload),
    timeout: 30000,
  });
}

