module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: { colors: { navy: "#0d2d52", gold: "#e4bc3f", cream: "#f8f6f0", muted: "#6c809a" } } },
  plugins: [],
};
