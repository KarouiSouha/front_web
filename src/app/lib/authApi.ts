import { api, apiFetch, TokenStorage } from './api';


export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface BackendUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string | null;
  role: 'admin' | 'manager' | 'agent';
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'suspended';
  permissions_list: string[];
  branch: string | null;
  branch_name: string | null;
  company: string | null;
  company_name: string | null;
  company_industry?: string | null;
  company_country?: string | null;
  company_city?: string | null;
  company_current_erp?: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  company_is_active?: boolean | null;
  must_change_password: boolean;
  is_verified: boolean;
  is_email_verified: boolean;   // NEW — manager email verification step
  created_at: string;
}

export interface ManagerSignupPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  company_name: string;
  password: string;
  password_confirm: string;
  industry?: string;
  country?: string;
  city?: string;
  current_erp?: string;
}

export interface ManagerSignupResponse {
  message: string;
  status: 'email_verification_pending';
  email: string;
}

export interface CreateAgentPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  branch?: string;
  permissions_list: string[];
  temporary_password: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

export interface ApproveRejectPayload {
  action: 'approve' | 'reject';
  reason?: string;
}

export interface UserListItem {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: string;
  status: string;
  branch_name: string | null;
  company: string | null;
  company_name: string | null;
  created_at: string;
  permissions_list: string[];
}

export interface PendingManagersResponse {
  count: number;
  pending_managers: UserListItem[];
}

export interface AgentListResponse {
  count: number;
  agents: UserListItem[];
}

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  country: string | null;
  city: string | null;
  current_erp: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────
// Auth Service
// ─────────────────────────────────────────────

export const authApi = {

  // ── JWT (token_security app → /api/auth/) ──────────────────────────────

  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  logout: async (): Promise<void> => {
    const refresh = TokenStorage.getRefresh();
    const access = TokenStorage.getAccess();
    const API_BASE = import.meta.env.VITE_API_URL ?? 'https://fasi-backend.onrender.com/api';
    if (refresh) {
      try {
        await fetch(`${API_BASE}/auth/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(access ? { Authorization: `Bearer ${access}` } : {}),
          },
          body: JSON.stringify({ refresh }),
        });
      } catch {
        // network down — local logout guaranteed
      }
    }
    TokenStorage.clear();
  },

  logoutAll: async (): Promise<{ message: string; sessions_revoked: number }> => {
    const API_BASE = import.meta.env.VITE_API_URL ?? 'https://fasi-backend.onrender.com/api';
    const access = TokenStorage.getAccess();
    const response = await fetch(`${API_BASE}/auth/logout-all/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to logout from all devices');
    }

    const result = await response.json();
    TokenStorage.clear();
    return result;
  },

  // ── Profile ─────────────────────────

  getProfile: (): Promise<BackendUser> =>
    api.get<BackendUser>('/users/profile/'),

  updateProfile: (data: UpdateProfilePayload) =>
    api.patch<{ message: string; user: BackendUser }>('/users/profile/', data),

  // ── Signup Manager ──────────────────────────────────────────────────────

  managerSignup: (payload: ManagerSignupPayload): Promise<ManagerSignupResponse> =>
    apiFetch<ManagerSignupResponse>('/users/signup/', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    }),

  // ── Email verification (NEW) ─────────────────────────────────────────────

  /**
   * Resend the email verification link to a manager who hasn't verified yet.
   * Called from the EmailVerificationPendingPage.
   */
  resendVerificationEmail: (email: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>('/users/resend-verification/', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    }),

  // ── Password ────────────────────────────────────────────────────────────

  changePassword: (payload: ChangePasswordPayload) =>
    api.post<{ message: string }>('/users/change-password/', payload),

  requestPasswordReset: (user_id: string) =>
    api.post<{ message: string }>('/users/password-reset/request/', { user_id }),

  confirmPasswordReset: (token: string, new_password: string, new_password_confirm: string) =>
    apiFetch<{ message: string }>('/users/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ token, new_password, new_password_confirm }),
      skipAuth: true,
    }),

  // ── Manager approval ────────────────────────────────────────────────────

  getPendingManagers: (): Promise<PendingManagersResponse> =>
    api.get<PendingManagersResponse>('/users/signup/pending/'),

  reviewManager: (managerId: string, payload: ApproveRejectPayload) =>
    api.post<{ message: string; manager: UserListItem }>(
      `/users/signup/review/${managerId}/`,
      payload
    ),

  // ── Agents ──────────────────────────────────────────────────────────────

  getAgents: (): Promise<AgentListResponse> =>
    api.get<AgentListResponse>('/users/agents/'),

  createAgent: (payload: CreateAgentPayload) =>
    api.post<{ message: string; agent: UserListItem }>('/users/agents/create/', payload),

  deleteAgent: (agentId: string) =>
    api.delete<{ message: string }>(`/users/agents/${agentId}/`),

  // ── All Users (admin) ───────────────────────────────────────────────────

  getAllUsers: (filters?: { role?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.role) params.set('role', filters.role);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString();
    return api.get<{ count: number; users: UserListItem[] }>(
      `/users/users/${qs ? '?' + qs : ''}`
    );
  },

  updatePermissions: (userId: string, permissions_list: string[]) =>
    api.patch<{ message: string; permissions_list: string[] }>(
      `/users/users/${userId}/permissions/`,
      { permissions_list }
    ),

  updateStatus: (userId: string, status: 'active' | 'suspended', reason?: string) =>
    api.patch<{ message: string }>(
      `/users/users/${userId}/status/`,
      { status, reason }
    ),

  // ── Companies (admin) ───────────────────────────────────────────────────

  getCompanies: (): Promise<{ count: number; companies: Company[] }> =>
    api.get('/companies/'),

  createCompany: (data: Partial<Company>) =>
    api.post<Company>('/companies/', data),

  updateCompany: (companyId: string, data: Partial<Company>) =>
    api.patch<Company>(`/companies/${companyId}/`, data),
};