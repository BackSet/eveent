import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "@/services/api";

interface User {
  id: number;
  nombre: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
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
    if (authState.token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${authState.token}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [authState.token]);

  const login = async (email: string, password: string) => {
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
  };

  const register = async (nombre: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await api.post("/api/auth/register", {
        nombre,
        email,
        password,
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
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthState({ token: null, user: null, isAuthenticated: false });
  };

  const hasRole = (role: string) => {
    return authState.user?.roles?.some(r => r.toLowerCase() === role.toLowerCase()) || false;
  };

  const hasPermission = (permission: string) => {
    return authState.user?.permissions?.some(p => p.toLowerCase() === permission.toLowerCase()) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
        hasRole,
        hasPermission,
        isLoading,
      }}
    >
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