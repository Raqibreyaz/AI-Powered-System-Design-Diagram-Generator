/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        // Core brand palette — dark developer-tool aesthetic
        surface: {
          DEFAULT: "#0f1117",
          1: "#161b27",
          2: "#1e2535",
          3: "#252d3d",
          4: "#2d3548",
        },
        border: {
          DEFAULT: "#2d3548",
          subtle: "#1e2535",
          strong: "#3d4a5f",
        },
        accent: {
          DEFAULT: "#6366f1", // indigo-500
          hover: "#818cf8",   // indigo-400
          muted: "#312e81",   // indigo-900
        },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        // Node type colors (also used in normalizer)
        node: {
          service: "#3b82f6",
          database: "#8b5cf6",
          queue: "#f59e0b",
          storage: "#10b981",
          gateway: "#6366f1",
          cdn: "#14b8a6",
          cache: "#f97316",
          client: "#64748b",
          loadbalancer: "#0ea5e9",
          monitor: "#ec4899",
          decision: "#eab308",
          external: "#94a3b8",
          generic: "#6b7280",
        },
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        lg: "10px",
        xl: "14px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};
