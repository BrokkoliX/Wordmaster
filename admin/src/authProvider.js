/**
 * Auth provider for React Admin.
 *
 * Uses the WordMaster backend auth endpoints:
 *   POST /api/auth/login   → returns { accessToken, refreshToken, user }
 *   POST /api/auth/logout
 *
 * Stores the JWT access token in localStorage and sends it as a
 * Bearer token on every admin API request (see dataProvider.js).
 */

const AUTH_URL = import.meta.env.VITE_AUTH_URL || '/api/auth';

const authProvider = {
  // ─── LOGIN ────────────────────────────────────────────────
  login: async ({ username, password }) => {
    const response = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error?.message || 'Login failed');
    }

    const { accessToken, refreshToken, user } = await response.json();

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // ─── LOGOUT ───────────────────────────────────────────────
  logout: async () => {
    const token = localStorage.getItem('token');

    // Best-effort server-side logout
    try {
      await fetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // Ignore — we clear local state anyway
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // ─── CHECK AUTH ───────────────────────────────────────────
  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }
  },

  // ─── CHECK ERROR ──────────────────────────────────────────
  checkError: async (error) => {
    const status = error?.status || error?.response?.status;

    if (status === 401 || status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      throw new Error('Session expired');
    }
  },

  // ─── GET IDENTITY ─────────────────────────────────────────
  getIdentity: async () => {
    const raw = localStorage.getItem('user');
    if (!raw) throw new Error('Not authenticated');

    const user = JSON.parse(raw);
    return {
      id: user.id,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email,
      avatar: user.avatar_url,
    };
  },

  // ─── GET PERMISSIONS ──────────────────────────────────────
  getPermissions: async () => {
    // The isAdmin middleware on the backend enforces admin access.
    // If we reach admin routes without a 403, we have permission.
    return 'admin';
  },
};

export default authProvider;
