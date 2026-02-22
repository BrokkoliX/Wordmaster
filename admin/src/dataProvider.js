/**
 * Custom data provider for React Admin.
 *
 * Bridges react-admin's expected request/response format with the
 * WordMaster backend admin API, which wraps results in named keys
 * (e.g. { users: [...], pagination: {...} }).
 */

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error?.message || response.statusText;
    throw new Error(message);
  }
  return response.json();
};

/**
 * Map react-admin resource names to the backend response wrapper keys
 * and any path overrides.
 */
const RESOURCE_CONFIG = {
  users: { dataKey: 'users', hasPagination: true },
  languages: { dataKey: 'languages', hasPagination: false },
  sentences: { dataKey: 'sentences', hasPagination: false },
  // Virtual/stats resources are read-only; handled by custom pages
};

const dataProvider = {
  // ─── GET LIST ─────────────────────────────────────────────
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination || { page: 1, perPage: 50 };
    const { field, order } = params.sort || { field: 'created_at', order: 'DESC' };

    const query = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      sortBy: field,
      sortOrder: order,
    });

    // Pass filter values (e.g. search, role) as query params
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.set(key, value);
        }
      });
    }

    const url = `${API_URL}/${resource}?${query.toString()}`;
    const json = await handleResponse(
      await fetch(url, { headers: getAuthHeaders() })
    );

    const config = RESOURCE_CONFIG[resource] || { dataKey: resource, hasPagination: false };
    const rawData = json[config.dataKey] || [];

    // React Admin requires every record to have an `id`.
    // Synthesise one for resources that lack a native id.
    const data = rawData.map((record, index) => {
      if (record.id !== undefined) return record;
      if (record.source_lang && record.target_lang) {
        return { ...record, id: `${record.source_lang}-${record.target_lang}` };
      }
      return { ...record, id: index };
    });

    const total = config.hasPagination
      ? json.pagination?.total ?? data.length
      : data.length;

    return { data, total };
  },

  // ─── GET ONE ──────────────────────────────────────────────
  getOne: async (resource, params) => {
    const url = `${API_URL}/${resource}/${params.id}`;
    const json = await handleResponse(
      await fetch(url, { headers: getAuthHeaders() })
    );

    // The backend wraps single-resource responses in a key (e.g. { user: {...} })
    const singularKey = resource.replace(/s$/, ''); // users → user
    const data = json[singularKey] || json;

    return { data };
  },

  // ─── GET MANY (by IDs) ───────────────────────────────────
  getMany: async (resource, params) => {
    // Backend doesn't have a bulk-get endpoint, so fetch one-by-one
    const results = await Promise.all(
      params.ids.map((id) =>
        fetch(`${API_URL}/${resource}/${id}`, { headers: getAuthHeaders() })
          .then(handleResponse)
          .then((json) => {
            const singularKey = resource.replace(/s$/, '');
            return json[singularKey] || json;
          })
      )
    );
    return { data: results };
  },

  // ─── GET MANY REFERENCE ──────────────────────────────────
  getManyReference: async (resource, params) => {
    // Fallback to getList with a filter
    const { page, perPage } = params.pagination || { page: 1, perPage: 50 };
    const { field, order } = params.sort || { field: 'id', order: 'ASC' };

    const query = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      sortBy: field,
      sortOrder: order,
      [params.target]: params.id,
    });

    const url = `${API_URL}/${resource}?${query.toString()}`;
    const json = await handleResponse(
      await fetch(url, { headers: getAuthHeaders() })
    );

    const config = RESOURCE_CONFIG[resource] || { dataKey: resource, hasPagination: false };
    const data = json[config.dataKey] || [];
    const total = config.hasPagination
      ? json.pagination?.total ?? data.length
      : data.length;

    return { data, total };
  },

  // ─── UPDATE ───────────────────────────────────────────────
  update: async (resource, params) => {
    const url = `${API_URL}/${resource}/${params.id}`;
    const json = await handleResponse(
      await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(params.data),
      })
    );

    const singularKey = resource.replace(/s$/, '');
    const data = json[singularKey] || json.data || { ...params.data, id: params.id };

    return { data };
  },

  // ─── UPDATE MANY ──────────────────────────────────────────
  updateMany: async (resource, params) => {
    await Promise.all(
      params.ids.map((id) =>
        fetch(`${API_URL}/${resource}/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(params.data),
        }).then(handleResponse)
      )
    );
    return { data: params.ids };
  },

  // ─── CREATE ───────────────────────────────────────────────
  create: async (resource, params) => {
    const url = `${API_URL}/${resource}`;
    const json = await handleResponse(
      await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params.data),
      })
    );

    const singularKey = resource.replace(/s$/, '');
    const data = json[singularKey] || json.data || json;

    // react-admin requires an id on the returned record
    if (!data.id) {
      data.id = data[singularKey]?.id || Date.now();
    }

    return { data };
  },

  // ─── DELETE ───────────────────────────────────────────────
  delete: async (resource, params) => {
    await handleResponse(
      await fetch(`${API_URL}/${resource}/${params.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
    );
    return { data: { id: params.id } };
  },

  // ─── DELETE MANY ──────────────────────────────────────────
  deleteMany: async (resource, params) => {
    await Promise.all(
      params.ids.map((id) =>
        fetch(`${API_URL}/${resource}/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }).then(handleResponse)
      )
    );
    return { data: params.ids };
  },
};

export default dataProvider;
