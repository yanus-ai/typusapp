import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

export interface Session {
  id: number;
  userId: number;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  batches?: Array<{
    id: number;
    prompt: string | null;
    createdAt: string;
    variations?: Array<{
      id: number;
      thumbnailUrl?: string;
      imageUrl?: string;
      status?: string;
    }>;
  }>;
  _count?: {
    batches: number;
  };
}

interface SessionState {
  sessions: Session[];
  currentSession: Session | null;
  loading: boolean;
  error: string | null;
}

const initialState: SessionState = {
  sessions: [],
  currentSession: null,
  loading: false,
  error: null,
};

// Create a new session
export const createSession = createAsyncThunk(
  'sessions/createSession',
  async (prompt: string | null = null, { rejectWithValue }) => {
    try {
      const response = await api.post('/sessions', { prompt });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create session');
    }
  }
);

// Get session by ID
export const getSession = createAsyncThunk(
  'sessions/getSession',
  async (sessionId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/sessions/${sessionId}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get session');
    }
  }
);

// Get all user sessions
export const getUserSessions = createAsyncThunk(
  'sessions/getUserSessions',
  async (limit: number = 50, { rejectWithValue }) => {
    try {
      const response = await api.get(`/sessions?limit=${limit}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get sessions');
    }
  }
);

// Update session name
export const updateSessionName = createAsyncThunk(
  'sessions/updateSessionName',
  async ({ sessionId, name }: { sessionId: number; name: string }, { rejectWithValue }) => {
    try {
      await api.put(`/sessions/${sessionId}`, { name });
      return { sessionId, name };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update session');
    }
  }
);

// Delete session
export const deleteSession = createAsyncThunk(
  'sessions/deleteSession',
  async (sessionId: number, { rejectWithValue }) => {
    try {
      await api.delete(`/sessions/${sessionId}`);
      return sessionId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete session');
    }
  }
);

const sessionSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    setCurrentSession: (state, action: PayloadAction<Session | null>) => {
      state.currentSession = action.payload;
    },
    clearCurrentSession: (state) => {
      state.currentSession = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create session
      .addCase(createSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload;
        // Add to sessions list if not already present
        if (!state.sessions.find(s => s.id === action.payload.id)) {
          state.sessions.unshift(action.payload);
        }
      })
      .addCase(createSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get session
      .addCase(getSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSession.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload;
      })
      .addCase(getSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get user sessions
      .addCase(getUserSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload;
      })
      .addCase(getUserSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update session name
      .addCase(updateSessionName.fulfilled, (state, action) => {
        const { sessionId, name } = action.payload;
        if (state.currentSession?.id === sessionId) {
          state.currentSession.name = name;
        }
        const session = state.sessions.find(s => s.id === sessionId);
        if (session) {
          session.name = name;
        }
      })
      // Delete session
      .addCase(deleteSession.fulfilled, (state, action) => {
        const sessionId = action.payload;
        state.sessions = state.sessions.filter(s => s.id !== sessionId);
        if (state.currentSession?.id === sessionId) {
          state.currentSession = null;
        }
      });
  },
});

export const { setCurrentSession, clearCurrentSession, clearError } = sessionSlice.actions;
export default sessionSlice.reducer;

