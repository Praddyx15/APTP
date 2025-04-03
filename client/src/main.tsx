/**
 * Application entry point with Vite HMR fixes
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Import our WebSocket fix before rendering the app
import "./vite-hmr-fix";

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const root = createRoot(rootElement);
root.render(<App />);
