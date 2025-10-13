# API Sandbox

API Sandbox is an Angular application for exploring REST APIs from the browser with a modern, responsive UI. It helps developers prototype requests across the most common HTTP verbs, inspect responses, and keep lightweight request history without relying on external tooling.

## Overview

The app lets you compose GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS requests, manage custom headers and body payloads, and review results inline. Request history is persisted using IndexedDB (with an in-memory fallback) so you can revisit previous calls even across sessions.

## Features

- Compose HTTP GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS requests with URL validation
- Automatically toggle request body editors for verbs that support payloads
- Add, edit, and remove custom headers and typed body fields
- Toggle between JSON-friendly input components, including boolean selectors
- Persist request history locally with IndexedDB, including timestamps and status
- Reload a previous request into the editor with a single click
- Responsive layout that switches between tabs (desktop) and accordions (mobile)

## Tech Stack

- [Angular 20](https://angular.dev/) with standalone components
- [PrimeNG](https://primeng.org/) UI components and theming
- [Tailwind CSS](https://tailwindcss.com/) utility classes
- [idb](https://github.com/jakearchibald/idb) IndexedDB promise wrapper
- TypeScript, RxJS, and the Angular CLI tooling

## Getting Started

### Prerequisites

- Node.js 18 or later (Angular 20 requires Node 18.19+ or 20.11+)
- npm 9+ (ships with current Node LTS)

### Installation

```bash
npm install
```

### Run the development server

```bash
npx ng serve
```

This starts the app on `http://localhost:4200/` with hot reload enabled.

### Build for production

```bash
npx ng build
```

The optimized output is written to the `dist/` directory.

### Run unit tests

```bash
npx ng test
```

The project uses Karma and Jasmine (Angular CLI defaults) for unit testing.

## Project Structure

- `src/app/components/api-params/` – main request builder UI (desktop & mobile layouts)
- `src/app/models/` – TypeScript interfaces for request history and shared types
- `src/app/data/idb.service.ts` – IndexedDB storage with in-memory fallback
- `src/app/services/` – HTTP integration services
- `public/` – static assets served as-is

## Local Data Storage

Request history is stored in IndexedDB using the `api-sandbox` database. When IndexedDB is unavailable (e.g., private browsing), the service transparently falls back to an in-memory store so the UI remains functional.

## Browser Support

The project targets the latest two versions of major Chromium, Firefox, Safari, iOS Safari, and Edge browsers plus Firefox ESR. See the [`browserslist`](browserslist) file for exact targets.

## Contributing

1. Fork the repository and create a feature branch.
2. Implement your changes with accompanying tests where practical.
3. Run the relevant `ng` commands (`serve`, `build`, `test`) to validate behavior.
4. Submit a pull request describing the motivation and any notable decisions.

## License

No explicit license has been provided. If you plan to use or redistribute this project, please open an issue or contact the repository owner to clarify licensing terms.
