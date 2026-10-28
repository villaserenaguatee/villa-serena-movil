module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: "#0d2d52",
        gold: "#c8a24a",
        cream: "#f8f6f0",
        sand: "#f1ece1",
        line: "#e2dacb",
        muted: "#766f63",
      },
    },
  },
  plugins: [],
};
