import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--bg)",
                foreground: "var(--fg)",
                muted: "var(--muted)",
                accent: {
                    DEFAULT: "var(--accent)",
                    hover: "var(--accent-hover)",
                },
                card: "var(--card)",
                border: "var(--border)",
                dsfr: {
                    blue: "#000091",
                    red: "#E1000F",
                    grey: "#161616",
                },
            },
            fontFamily: {
                sans: ["Marianne", "system-ui", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
