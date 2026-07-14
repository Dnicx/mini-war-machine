# mini-war-machine
A warhammer40k companion web app to help you remember what to do in each phase of the game

## Setup

### Prerequisites
- Node.js (v18 or higher)
- Python 3.x
- npm or yarn

### Setup
1. Install Node.js dependencies:
```
npm install
```

2. Set up Python virtual environment for extraction scripts:
```
python -m venv venv
venv\Scripts\pip install -r requirements.txt
```

### Running the App

Start the development server:
```bash
npm run dev
```

### Stratagem Extraction Scripts

The project includes Python scripts to extract stratagem data from Warhammer 40k faction pack PDFs:

1. Place faction pack PDFs in `src/stratagems/source_pdf/`
2. Extract stratagems
```bash
npm run extract-stratagems
```

Extracted stratagems will be saved to `src/stratagems/` organized by faction.

### Build

Build for production:
```bash
npm run build
```

## Android (Capacitor)

After any code change, run:
```bash
npx vite build
npx cap sync android
npx cap run android
```

Or use the convenience script:
```bash
npm run build:android
```

For live reload
```bash
npm run dev
```
And in another terminal
```bash
npx cap run android --live-reload --port 5173
```

Select your physical device from the list when prompted.

> **Tip:** If you only changed JS/CSS, all three steps are needed. If you only changed native Android config, just `npx cap run android` is enough.

## Theme & UI Customization

Two config layers, no code changes required:

### UI config (dev-facing) — `src/config/ui.config.json`
Controls button styles, icon choices for key actions (lucide icon names), and typography
(font family, base size). Components read button classes via `cardStyles.button` and icons
via `appIcon()` from `src/config/icons.ts`.

Buttons are described semantically and compiled to Tailwind in `src/styles/components.ts`:

- `shape` (shared): `square`, `rounded`, or `pill`
- per variant (`primary`, `secondary`, `accent`): `size` (`sm`/`md`/`lg`), `fill` and
  `text` (a theme color name — `background`, `surface`, `surface2`, `accent`, `text`,
  `text2` — or `white`)
- `icon` variant: `color` and `hoverColor` (same color names)

Filled buttons dim to 80% fill on hover automatically. Unknown values fall back to
defaults. To allow a new option (e.g. a new size), add its literal Tailwind classes to
the lookup tables in `src/styles/components.ts`.

### Theme presets — `src/themes/*.json`
Color palettes selectable in-app via the settings (gear) icon on the import screen.
Each preset is a JSON file with an `id`, a display `name`, and 6 hex `colors`
(`background`, `surface`, `surface2`, `accent`, `text`, `text2`). Drop a new .json file
into `src/themes/` to add a preset; edit an existing file to tweak one. The selected
theme is stored in localStorage and applied as CSS variables at startup.
