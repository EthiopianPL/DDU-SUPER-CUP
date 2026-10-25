
import { bootLeague } from "./data/live";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

bootLeague().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});