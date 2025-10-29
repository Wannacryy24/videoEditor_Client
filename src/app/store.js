import { configureStore } from "@reduxjs/toolkit";
import editorReducer from "../features/editor/editorSlice";

export const store = configureStore({
  reducer: {
    editor: editorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // ignore the `selectedFile` field
        ignoredPaths: ["editor.selectedFile"],
        // optionally ignore actions entirely
        ignoredActions: ["editor/setSelectedFile"],
      },
    }),
});
