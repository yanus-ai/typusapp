import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import inputImagesReducer from "../features/images/inputImagesSlice";
import historyImagesReducer from "../features/images/historyImagesSlice";
import createUIReducer from "../features/create/createUISlice";
import customizationReducer from "../features/customization/customizationSlice";
import maskReducer from "@/features/masks/maskSlice";
import tweakReducer from "@/features/tweak/tweakSlice";
import refineReducer from "@/features/refine/refineSlice";
import refineMaterialsReducer from "@/features/refine/refineMaterialsSlice";
import galleryReducer from "@/features/gallery/gallerySlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    inputImages: inputImagesReducer,
    historyImages: historyImagesReducer,
    createUI: createUIReducer,
    customization: customizationReducer,
    masks: maskReducer,
    tweak: tweakReducer,
    refine: refineReducer,
    refineMaterials: refineMaterialsReducer,
    gallery: galleryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;