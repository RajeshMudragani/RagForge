/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                surface: {
                    50:  "#f8f7f5",
                    100: "#f0ede8",
                    200: "#e4dfd8",
                    300: "#cdc5ba",
                    400: "#b0a496",
                    500: "#968778",
                    600: "#7d6e60",
                    700: "#675a4e",
                    800: "#554a42",
                    900: "#473f38",
                },
                brand: {
                    50:  "#effaf6",
                    100: "#d8f3e8",
                    200: "#b4e6d3",
                    300: "#81d2b8",
                    400: "#4bb898",
                    500: "#2a9d7f",
                    600: "#207d66",
                    700: "#1c6454",
                    800: "#1a5045",
                    900: "#18423a",
                    950: "#0d2922",
                },
                sidebar: {
                    bg:     "#1e1c1a",
                    hover:  "#2a2724",
                    active: "#332f2b",
                    border: "#3a3632",
                    muted:  "#706860",
                    text:   "#c5b9ad",
                },
            },
            fontFamily: {
                sans: ["Inter", "ui-sans-serif", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
                mono: ['"JetBrains Mono"', '"Fira Code"', "ui-monospace", "Consolas", "monospace"],
            },
            fontSize: {
                "2xs": ["0.7rem",   { lineHeight: "1rem"  }],
                xs:    ["0.8rem",   { lineHeight: "1.2rem"}],
                sm:    ["0.9rem",   { lineHeight: "1.4rem"}],
                base:  ["1rem",     { lineHeight: "1.6rem"}],
                lg:    ["1.1rem",   { lineHeight: "1.7rem"}],
                xl:    ["1.25rem",  { lineHeight: "1.8rem"}],
                "2xl": ["1.5rem",   { lineHeight: "2rem"  }],
                "3xl": ["1.875rem", { lineHeight: "2.3rem"}],
            },
            spacing: {
                "4.5": "1.125rem",
                "18":  "4.5rem",
            },
            borderRadius: {
                "2xl": "1rem",
                "3xl": "1.25rem",
            },
            animation: {
                "fade-in":  "fadeIn 0.18s ease-out",
                "slide-up": "slideUp 0.18s ease-out",
                "pulse-dot":"pulseDot 1.4s infinite ease-in-out",
            },
            keyframes: {
                fadeIn:   { from: { opacity: 0 },                               to: { opacity: 1 } },
                slideUp:  { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } },
                pulseDot: {
                    "0%, 80%, 100%": {
                        transform: "translateY(0)",
                        opacity: "0.4",
                    },
                    "40%": {
                        transform: "translateY(-6px)",
                        opacity: "1",
                    },
                },
            },
            boxShadow: {
                card:  "0 1px 3px 0 rgba(0,0,0,.07), 0 1px 2px -1px rgba(0,0,0,.05)",
                panel: "0 4px 16px -2px rgba(0,0,0,.08), 0 2px 6px -2px rgba(0,0,0,.05)",
                input: "0 0 0 3px rgba(42,157,127,.15)",
            },
        },
    },
    plugins: [],
};
