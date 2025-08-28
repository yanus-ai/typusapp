import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AuthResponse, LoginCredentials, RegisterData, User, Subscription } from "@/types/auth";
import authService from "../../services/authService";
import { getLocalStorage } from "../../utils/helpers";

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  credits: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Get user from localStorage
const user = getLocalStorage<User | null>("user", null);
const subscription = getLocalStorage<Subscription | null>("subscription", null);
const credits = getLocalStorage<number>("credits", 0);

const initialState: AuthState = {
  user,
  subscription,
  credits,
  isAuthenticated: !!user,
  isLoading: false,
  error: null,
  isInitialized: false,
};

// Register user
export const register = createAsyncThunk<
  AuthResponse,
  RegisterData,
  { rejectValue: string }
>("auth/register", async (userData, thunkAPI) => {
  try {
    return await authService.register(userData);
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Login user
export const login = createAsyncThunk<
  AuthResponse,
  LoginCredentials,
  { rejectValue: any }
>("auth/login", async (credentials, thunkAPI) => {
  try {
    return await authService.login(credentials);
  } catch (error: any) {
    // For email verification errors, we need to pass more than just the message
    const errorData = error.response?.data;
    if (errorData?.emailVerificationRequired) {
      return thunkAPI.rejectWithValue({
        message: errorData.message,
        emailVerificationRequired: true,
        email: errorData.email
      });
    }
    
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Google login
export const googleLogin = createAsyncThunk<
  AuthResponse,
  string,
  { rejectValue: string }
>("auth/googleLogin", async (token, thunkAPI) => {
  try {
    return await authService.googleLogin(token);
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Fetch current user
export const fetchCurrentUser = createAsyncThunk<
  AuthResponse,
  void,
  { rejectValue: string }
>("auth/fetchCurrentUser", async (_, thunkAPI) => {
  try {
    return await authService.getCurrentUser();
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Verify email
export const verifyEmail = createAsyncThunk<
  AuthResponse,
  string,
  { rejectValue: string }
>("auth/verifyEmail", async (token, thunkAPI) => {
  try {
    return await authService.verifyEmail(token);
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Resend verification email
export const resendVerificationEmail = createAsyncThunk<
  any,
  string,
  { rejectValue: string }
>("auth/resendVerificationEmail", async (email, thunkAPI) => {
  try {
    return await authService.resendVerificationEmail(email);
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Logout user
export const logout = createAsyncThunk("auth/logout", async () => {
  authService.logout();
});

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.error = null;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    updateCredits: (state, action: PayloadAction<number>) => {
      state.credits = action.payload;
      // Also update localStorage
      localStorage.setItem("credits", action.payload.toString());
    }
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.error = null;
        // Registration now requires email verification, so don't set user as authenticated
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Registration failed";
        state.user = null;
        state.subscription = null;
        state.credits = 0;
        state.isAuthenticated = false;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.subscription = action.payload.subscription;
        state.credits = action.payload.credits;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        // Handle both string errors and email verification errors
        const payload = action.payload;
        if (typeof payload === 'object' && payload?.message) {
          state.error = payload.message;
        } else {
          state.error = payload || "Login failed";
        }
        state.user = null;
        state.subscription = null;
        state.credits = 0;
        state.isAuthenticated = false;
      })
      // Google Login
      .addCase(googleLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.subscription = action.payload.subscription;
        state.credits = action.payload.credits;
        state.error = null;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Google login failed";
        state.user = null;
        state.subscription = null;
        state.credits = 0;
        state.isAuthenticated = false;
      })
      // Fetch Current User
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.subscription = action.payload.subscription;
        state.credits = action.payload.credits;
        state.isAuthenticated = true;
        state.error = null;
        state.isInitialized = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.subscription = null;
        state.credits = 0;
        state.isAuthenticated = false;
        state.error = action.payload || "Failed to fetch user";
        state.isInitialized = true;
      })
      // Verify Email
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.subscription = action.payload.subscription;
        state.credits = action.payload.credits;
        state.error = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Email verification failed";
      })
      // Resend Verification Email
      .addCase(resendVerificationEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resendVerificationEmail.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(resendVerificationEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to resend verification email";
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.subscription = null;
        state.credits = 0;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { reset, setInitialized, updateCredits } = authSlice.actions;
export default authSlice.reducer;