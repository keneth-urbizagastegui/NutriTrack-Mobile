import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Platform } from 'react-native';

const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1';
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

export interface UserSession {
  id: number;
  username: string;
  email: string;
  roles: string[];
}

interface AuthState {
  user: UserSession | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  sessionAllergens: any[];
  login: (username: string, access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
  updateAccessToken: (access: string) => Promise<void>;
  setSessionAllergens: (allergens: any[]) => Promise<void>;
  hydrate: () => Promise<void>;
}

const getRolesFromUsername = (username: string): string[] => {
  const roles = ['ROLE_USER'];
  if (username.toLowerCase().includes('admin')) {
    roles.push('ROLE_ADMIN');
    roles.push('ROLE_MANAGER');
  } else if (username.toLowerCase().includes('manager')) {
    roles.push('ROLE_MANAGER');
  }
  return roles;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  sessionAllergens: [],

  login: async (username, access, refresh) => {
    await SecureStore.setItemAsync('accessToken', access);
    await SecureStore.setItemAsync('refreshToken', refresh);

    try {
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${access}` }
      });
      const profile = response.data;
      const roles = profile.roles.map((r: any) => r.name || r);
      const userData: UserSession = {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        roles,
      };

      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      await SecureStore.setItemAsync('sessionAllergens', JSON.stringify(profile.allergens || []));

      set({
        user: userData,
        accessToken: access,
        refreshToken: refresh,
        isAuthenticated: true,
        sessionAllergens: profile.allergens || [],
      });
    } catch (e) {
      console.error('Error fetching profile on login', e);
      const roles = getRolesFromUsername(username);
      const userData: UserSession = {
        id: Date.now(),
        username,
        email: `${username}@utec.edu.pe`,
        roles,
      };

      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      await SecureStore.setItemAsync('sessionAllergens', JSON.stringify([]));

      set({
        user: userData,
        accessToken: access,
        refreshToken: refresh,
        isAuthenticated: true,
        sessionAllergens: [],
      });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('sessionAllergens');

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      sessionAllergens: [],
    });
  },

  updateAccessToken: async (access) => {
    await SecureStore.setItemAsync('accessToken', access);
    set({ accessToken: access });
  },

  setSessionAllergens: async (allergens) => {
    await SecureStore.setItemAsync('sessionAllergens', JSON.stringify(allergens));
    set({ sessionAllergens: allergens });
  },

  hydrate: async () => {
    try {
      const storedAccess = await SecureStore.getItemAsync('accessToken');
      const storedRefresh = await SecureStore.getItemAsync('refreshToken');
      const storedUser = await SecureStore.getItemAsync('user');
      const storedAllergens = await SecureStore.getItemAsync('sessionAllergens');

      set({
        accessToken: storedAccess,
        refreshToken: storedRefresh,
        user: storedUser ? JSON.parse(storedUser) : null,
        isAuthenticated: !!storedAccess,
        sessionAllergens: storedAllergens ? JSON.parse(storedAllergens) : [],
      });

      if (storedAccess) {
        try {
          const response = await axios.get(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${storedAccess}` }
          });
          const profile = response.data;
          const roles = profile.roles.map((r: any) => r.name || r);
          const userData: UserSession = {
            id: profile.id,
            username: profile.username,
            email: profile.email,
            roles,
          };

          await SecureStore.setItemAsync('user', JSON.stringify(userData));
          await SecureStore.setItemAsync('sessionAllergens', JSON.stringify(profile.allergens || []));

          set({
            user: userData,
            sessionAllergens: profile.allergens || [],
          });
        } catch (serverErr) {
          console.log('Background profile sync skipped', serverErr);
        }
      }
    } catch (e) {
      console.error('Error hydrating mobile auth session', e);
    }
  },
}));
