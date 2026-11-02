import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            "/api": {
                target: "http://localhost:7892",
                changeOrigin: true,
            },
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("react-syntax-highlighter") || id.includes("react-markdown") || id.includes("remark-gfm")) {
                        return "vendor-markdown";
                    }
                    if (id.includes("lucide-react")) {
                        return "vendor-icons";
                    }
                    if (id.includes("date-fns") || id.includes("clsx") || id.includes("axios")) {
                        return "vendor-utils";
                    }
                    if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("react-router")) {
                        return "vendor-react";
                    }
                },
            },
        },
    },
});
