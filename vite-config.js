import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Replace 'a11y-monitor' with your GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: "/a11y-monitor/",
});
