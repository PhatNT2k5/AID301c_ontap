import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/mali/vietnamese-500.css";
import "@fontsource/mali/vietnamese-600.css";
import "@fontsource/mali/latin-500.css";
import "@fontsource/mali/latin-600.css";
import "./index.css";
import { App } from "./App";
import { StoreProvider } from "./store";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
