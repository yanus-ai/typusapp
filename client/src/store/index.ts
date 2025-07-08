import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import inputImagesReducer from "../features/images/inputImagesSlice";
import historyImagesReducer from "../features/images/historyImagesSlice";
import createUIReducer from "../features/create/createUISlice";
import customizationReducer from "../features/customization/customizationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    inputImages: inputImagesReducer,
    historyImages: historyImagesReducer,
    createUI: createUIReducer,
    customization: customizationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;