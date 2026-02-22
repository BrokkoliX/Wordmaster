# Shared Code

Common utilities, types, and constants used across multiple Wordmaster apps.

## Structure

```
shared/
├── types/           # TypeScript type definitions
├── constants/       # Shared constants (API endpoints, CEFR levels, etc.)
├── utils/           # Utility functions
└── validators/      # Validation schemas
```

## Usage

Each app can import from this folder:

```javascript
// From backend
const { CEFR_LEVELS } = require('../shared/constants/levels');

// From mobile/web/admin
import { validateEmail } from '../../shared/utils/validators';
import { UserRole } from '../../shared/types/user';
```

## Future Content

As code is duplicated across projects, move it here:

- API response types
- User role enums
- Language codes
- CEFR level definitions
- Common validation functions
- Date/time utilities
- API client configurations
