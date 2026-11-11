import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          900: "#0F172A",
        },
        emerald: {
          500: "#10B981",
        },
        rose: {
          500: "#F43F5E",
        },
        amber: {
          500: "#F59E0B",
        },
        violet: {
          500: "#8B5CF6",
        },
      },
    },
  },
  plugins: [],
};
export default config;

