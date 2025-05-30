# Frontend Dependency Version Requirements

This document outlines the specific package versions required for the UltimateSensorMonitor frontend to function correctly, along with the reasons for these version constraints and known compatibility issues.

## Critical Package Versions

The following package versions are known to work together without HMR-related errors:

| Package | Version | Importance |
|---------|---------|------------|
| @sveltejs/kit | 1.27.6 | Core framework |
| svelte | 4.2.7 | Core UI library |
| vite | 4.5.0 | Build tool and dev server |
| @sveltejs/adapter-auto | 3.0.0 | Production adapter |
| @sveltejs/vite-plugin-svelte | 3.0.0 | Svelte integration for Vite |

## Compatibility Issues and Rationale

### Hot Module Replacement (HMR) Issue

We encountered a critical "Unrecognized option 'hmr'" error when using newer versions of the above packages. This error occurs because:

1. In newer versions of the SvelteKit ecosystem (v2.x and up), the handling of HMR options changed
2. The `hmr` configuration option is mistakenly passed directly to the Svelte compiler, which doesn't recognize it
3. The error occurs during server-side rendering (SSR) module evaluation

The version combination above resolves this issue by using the last stable release of SvelteKit 1.x and its compatible dependencies.

### Version Interdependencies

These packages have strict interdependencies:

- **@sveltejs/kit** and **@sveltejs/adapter-auto**: Must be compatible major versions
- **@sveltejs/vite-plugin-svelte**: Must match the SvelteKit version requirements
- **svelte**: SvelteKit 1.x works with Svelte 4.x, while SvelteKit 2.x requires specific Svelte versions
- **vite**: SvelteKit 1.x works best with Vite 4.x

## Known Vulnerabilities

The package combination above still has some known vulnerabilities:

1. **cookie** package (dependency of SvelteKit): Has character sanitization issues
2. **esbuild** (dependency of Vite): Has some server-side request issues in development mode

These vulnerabilities have relatively low real-world impact in our specific use case but should be monitored for future fixes.

## Updating Dependencies

When updating these packages in the future:

1. **Always update as a group**: These packages should be updated together, not individually
2. **Test HMR functionality**: Verify that hot module replacement works correctly after updates
3. **Use `--legacy-peer-deps`**: Install with this flag to handle peer dependency conflicts
4. **Consider Vite configuration changes**: If upgrading to SvelteKit 2.x or Vite 5.x+, review Vite configuration options

## Installation Command

To install this specific set of compatible packages:

```bash
npm install @sveltejs/kit@1.27.6 @sveltejs/adapter-auto@3.0.0 @sveltejs/vite-plugin-svelte@3.0.0 vite@4.5.0 svelte@4.2.7 --save-dev --legacy-peer-deps
```

## Vite Configuration

For these package versions, a minimal Vite configuration is recommended:

```javascript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    // Your server settings here
  }
});
```

Avoid custom HMR configurations as they may cause the "Unrecognized option 'hmr'" error to resurface.

