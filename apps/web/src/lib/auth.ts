export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export function saveAuth(user: AuthUser, accessToken: string, refreshToken: string) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
