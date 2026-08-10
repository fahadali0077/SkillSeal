/** @type {import('tailwindcss').Config} */

// ─────────────────────────────────────────────────────────────────────────────
// SkillSeal · "The Seal of Record"
// Ink navy carries the UI. Oxblood is reserved — it appears only on issuance,
// seals and the single primary action per screen.
// ─────────────────────────────────────────────────────────────────────────────

const ink = {
  950: '#050C14', 900: '#0A1520', 800: '#12233A', 700: '#23384F',
  600: '#33495F', 500: '#4A5F79', 400: '#7C8DA1', 300: '#94A6BA',
  200: '#B9C5D2', 100: '#DCE2E9',  50: '#EEF1F5',
};

const seal = {
  950: '#3F0A13', 900: '#5A0F1B', 800: '#63131F', 700: '#6B1622',
  600: '#8A1F2F', 500: '#A03340', 400: '#B65E68', 300: '#C98A93',
  200: '#E3BFC3', 100: '#F0DBDD',  50: '#F6E9E9',
};

const paper = {
  DEFAULT: '#FBF9F6',  // app background
  card:    '#FFFFFF',  // cards
  sunk:    '#F3EFE8',  // inset rows, inputs
  line:    '#E6E0D6',  // borders
  rule:    '#D6CEC1',  // strong rule
};

const pass = { DEFAULT: '#1D7A4C', tint: '#E8F3EC', line: '#C3E0CE' };
const warn = { DEFAULT: '#A8710F', tint: '#FAF0DC', line: '#E8D3A6' };
const fail = { DEFAULT: '#A3221B', tint: '#FBEDEC', line: '#EBC9CD' };

// Warm neutral ramp: paper at the light end, ink at the dark end. This is what
// every legacy `gray-*` / `slate-*` utility in the codebase now resolves to, so
// surfaces go warm and text goes navy without touching 100+ files.
const neutral = {
  950: '#050C14', 900: '#0A1520', 800: '#12233A', 700: '#23384F',
  600: '#4A5F79', 500: '#7C8DA1', 400: '#94A6BA', 300: '#D6CEC1',
  200: '#E6E0D6', 100: '#F3EFE8',  50: '#F7F4EF',
};

// Legacy accent families are folded into ink — the redesign has no second hue.
const inkRamp = {
  950: '#050C14', 900: '#0A1520', 800: '#12233A', 700: '#23384F',
  600: '#23384F', 500: '#4A5F79', 400: '#7C8DA1', 300: '#94A6BA',
  200: '#DCE2E9', 100: '#EEF1F5',  50: '#F3F5F8',
};

const passRamp = {
  950: '#08251A', 900: '#0D3A26', 800: '#124E33', 700: '#176240',
  600: '#1D7A4C', 500: '#1D7A4C', 400: '#4E9E74', 300: '#9CCBB0',
  200: '#C3E0CE', 100: '#DCEDE3',  50: '#E8F3EC',
};

const warnRamp = {
  950: '#3A2705', 900: '#513607', 800: '#6D480A', 700: '#8A5C0C',
  600: '#A8710F', 500: '#A8710F', 400: '#C0913A', 300: '#D8B978',
  200: '#E8D3A6', 100: '#F6E7C7',  50: '#FAF0DC',
};

const failRamp = {
  950: '#380D0B', 900: '#4F1310', 800: '#6B1A15', 700: '#87201A',
  600: '#A3221B', 500: '#A3221B', 400: '#C25E5C', 300: '#DCA5A8',
  200: '#EBC9CD', 100: '#F7DEDD',  50: '#FBEDEC',
};

module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink, seal, paper, pass, warn, fail,

        // `brand` stays in the palette so existing markup keeps compiling —
        // it now points at ink, not blue. Oxblood is placed by hand.
        brand:         ink[800],
        'brand-dark':  ink[900],
        'brand-light': ink[500],

        // Remapped legacy families.
        gray: neutral, slate: neutral, zinc: neutral,
        neutral, stone: neutral,
        blue: inkRamp, sky: inkRamp, cyan: inkRamp,
        indigo: inkRamp, violet: inkRamp, purple: inkRamp, fuchsia: inkRamp,
        green: passRamp, emerald: passRamp, teal: passRamp, lime: passRamp,
        amber: warnRamp, yellow: warnRamp, orange: warnRamp,
        red: failRamp, rose: failRamp, pink: failRamp,
      },

      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        sans:    ['"Public Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      // Radius ceiling is 8px. Controls 4, cards 6, frames 8.
      borderRadius: {
        none: '0', sm: '3px', DEFAULT: '4px', md: '4px',
        lg: '6px', xl: '6px', '2xl': '8px', '3xl': '8px',
        full: '9999px',
      },

      // Borders before shadows. Depth is rationed.
      boxShadow: {
        card:   '0 1px 2px rgba(14,26,43,0.04)',
        raised: '0 4px 18px rgba(14,26,43,0.06)',
        pop:    '0 12px 32px rgba(14,26,43,0.14)',
        sm:     '0 1px 2px rgba(14,26,43,0.04)',
        DEFAULT:'0 1px 2px rgba(14,26,43,0.04)',
        md:     '0 1px 2px rgba(14,26,43,0.04)',
        lg:     '0 4px 18px rgba(14,26,43,0.06)',
        xl:     '0 4px 18px rgba(14,26,43,0.06)',
        '2xl':  '0 12px 32px rgba(14,26,43,0.14)',
        inner:  'inset 0 1px 2px rgba(14,26,43,0.05)',
        none:   'none',
      },

      ringColor:   { DEFAULT: ink[800] },
      borderColor: { DEFAULT: paper.line },

      transitionTimingFunction: {
        // Official things do not bounce.
        seal: 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
};
