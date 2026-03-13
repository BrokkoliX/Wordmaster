# Shared Code

Constants used across the mobile app, backend, and admin panel.

## Structure

```
shared/
└── constants/
    ├── cefr-levels.js   CEFR level definitions, ordering, and comparison
    └── languages.js     Supported languages, hub designations, pair generation
```

## Usage

The backend and scripts can require these files directly:

```javascript
const { CEFR_LEVELS } = require('../../shared/constants/cefr-levels');
const { LANGUAGES, buildHubPairs } = require('../../shared/constants/languages');
```

The mobile app cannot resolve paths outside its project root with Metro's default configuration. `mobile/metro.config.js` is configured with `watchFolders` and `extraNodeModules` to make `shared/` importable:

```javascript
import { CEFR_LEVELS } from 'shared/constants/cefr-levels';
import { LANGUAGES } from 'shared/constants/languages';
```

## Adding Shared Code

When the same constant, type, or utility is duplicated between projects, move the canonical copy here and import from both consumers.
