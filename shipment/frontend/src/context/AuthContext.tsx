import React, { createContext, useContext, useState, useEffect } from "react";
import shipperApi, { ShipperUser } from "../api/shipperApi";

interface AuthContextType {
  user: ShipperUser | null;
  token: string | null;
  loading: boolean;
  login: (emailOrPhone: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateUser: (updated: Partial<ShipperUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ShipperUser | null>(() => {
    const saved = localStorage.getItem("shipper_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("shipper_token");
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const profile = await shipperApi.getProfile();
      setUser(profile);
      localStorage.setItem("shipper_user", JSON.stringify(profile));
    } catch (error) {
      console.error("Failed to refresh shipper profile", error);
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (emailOrPhone: string, pass: string) => {
    const res = await shipperApi.login(emailOrPhone, pass);
    const { user: userData, accessToken } = res.data;
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem("shipper_token", accessToken);
    localStorage.setItem("shipper_user", JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("shipper_token");
    localStorage.removeItem("shipper_user");
    window.location.href = "/login";
  };

  const updateUser = (updated: Partial<ShipperUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem("shipper_user", JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
