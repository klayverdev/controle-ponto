import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        pop: { "0%": { transform: "scale(.92)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "20%,60%": { transform: "translateX(-8px)" }, "40%,80%": { transform: "translateX(8px)" } },
        shrink: { from: { width: "100%" }, to: { width: "0%" } },
      },
      animation: {
        pop: "pop .25s ease-out",
        shake: "shake .4s ease-in-out",
        shrink: "shrink linear forwards",
      },
    },
  },
} satisfies Config;
