import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { authService } from "@/services/authService";

// ─── Types ────────────────────────────────────────────────────────────────────
export type User = {
  id: number;
  email: string;
  phone: string;
  password?: string;
  role: { id: number; role_name: string } | string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  isVendor?: boolean;
  shipper_shop_id?: number | null;
  address?: string;
  profile?: any;
};

export type AuthState = {
  user: User | null;
  accessToken: string;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
};

const initialState: AuthState = {
  user: null,
  accessToken: "",
  isAuthenticated: false,
  loading: false,
  error: null,
  // true = app có thể render; false = đang verify token
  // Mặc định true để app không bị block khi chưa có token
  initialized: true,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * Chạy 1 lần khi app mount. Gọi GET /user/profile để verify token.
 * Nếu token hết hạn → interceptor sẽ thử refresh.
 * Nếu refresh cũng hết → interceptor dispatch logout và redirect /auth/login.
 */
export const initAuthThunk = createAsyncThunk(
  "auth/init",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getMe();
      return response.data?.data as User;
    } catch {
      return rejectWithValue("Token hết hạn");
    }
  },
);

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (
    payload: { email_or_phone: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await authService.login(payload);
      const data = response.data?.data;
      if (!data) {
        return rejectWithValue(
          response.data?.message || "Đăng nhập thất bại",
        );
      }
      return data;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      return rejectWithValue(
        axiosError.response?.data?.message ||
          "Đăng nhập thất bại. Vui lòng thử lại.",
      );
    }
  },
);

export const googleLoginThunk = createAsyncThunk(
  "auth/googleLogin",
  async (googleAccessToken: string, { rejectWithValue }) => {
    try {
      const response = await authService.googleLogin(googleAccessToken);
      const data = response.data?.data;
      if (!data) {
        return rejectWithValue(
          response.data?.message || "Đăng nhập bằng Google thất bại.",
        );
      }
      return data;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      return rejectWithValue(
        axiosError.response?.data?.message ||
          "Đăng nhập bằng Google thất bại.",
      );
    }
  },
);

// ─── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Dùng để cập nhật user sau khi sửa profile
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },

    // Dùng để cập nhật accessToken sau khi refresh
    setToken: (state, action: PayloadAction<{ accessToken: string }>) => {
      state.accessToken = action.payload.accessToken;
    },

    logout: (state) => {
      state.user = null;
      state.accessToken = "";
      state.isAuthenticated = false;
      state.error = null;
      state.loading = false;
      state.initialized = true;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── initAuth ──
      .addCase(initAuthThunk.pending, (state) => {
        state.loading = true;
        state.initialized = false;
      })
      .addCase(initAuthThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(initAuthThunk.rejected, (state) => {
        state.loading = false;
        state.initialized = true;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = "";
      })
      // ── login ──
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.isAuthenticated = true;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // ── google login ──
      .addCase(googleLoginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLoginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.isAuthenticated = true;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(googleLoginThunk.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });
  },
});

export const { setUser, setToken, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
