import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import api from "@/services/api";

interface User {
  id: number;
  nombre: string;
  email: string;
  roles: string[];
  permissions: string[];
  username?: string;
  numeroCamiseta?: number;
  fechaFinSuspension?: string | null;
  motivoSuspension?: string | null;
  autoAceptacionModo?: string;
  autoAceptacionResumen?: string;
  autoAceptacionActiva?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    nombre: string,
    email: string,
    password: string,
    username: string,
    numeroCamiseta: number,
    posicionIds?: number[],
    registerAsOrganizador?: boolean
  ) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    token: localStorage.getItem("token"),
    user: JSON.parse(localStorage.getItem("user") || "null"),
    isAuthenticated: !!localStorage.getItem("token"),
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.setToken(authState.token || null);
  }, [authState.token]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      setAuthState({
        token: data.token,
        user: data,
        isAuthenticated: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (
    nombre: string,
    email: string,
    password: string,
    username: string,
    numeroCamiseta: number,
    posicionIds?: number[],
    registerAsOrganizador = false
  ) => {
    setIsLoading(true);
    try {
      const { data } = await api.post("/api/auth/register", {
        nombre,
        email,
        password,
        username,
        numeroCamiseta,
        posicionIds: registerAsOrganizador ? [] : posicionIds,
        registerAsOrganizador,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      setAuthState({
        token: data.token,
        user: data,
        isAuthenticated: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthState({ token: null, user: null, isAuthenticated: false });
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setAuthState(prev => {
      if (!prev.user) return prev;
      const updated = { ...prev.user, ...userData };
      localStorage.setItem("user", JSON.stringify(updated));
      return { ...prev, user: updated };
    });
  }, []);

  const hasRole = useCallback((role: string) => {
    return authState.user?.roles?.some(r => r.toLowerCase() === role.toLowerCase()) || false;
  }, [authState.user]);

  const hasPermission = useCallback((permission: string) => {
    return authState.user?.permissions?.some(p => p.toLowerCase() === permission.toLowerCase()) || false;
  }, [authState.user]);

  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      api.get("/api/usuarios/me")
        .then(({ data }) => {
          setAuthState(prev => {
            if (!prev.user) return prev;
            const updated = { ...prev.user, ...data };
            localStorage.setItem("user", JSON.stringify(updated));
            return { ...prev, user: updated };
          });
        })
        .catch(err => {
          console.error("Error al sincronizar el perfil del usuario:", err);
          if (err.response?.status === 401) {
            logout();
          }
        });
    }
  }, [authState.token, authState.isAuthenticated, logout]);

  const contextValue = useMemo(() => ({
    ...authState,
    login,
    register,
    logout,
    hasRole,
    hasPermission,
    isLoading,
    updateUser,
  }), [authState, login, register, logout, hasRole, hasPermission, isLoading, updateUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}