# DAB Config Builder

An Angular application for creating and managing [Azure Data API Builder (DAB)](https://learn.microsoft.com/en-us/azure/data-api-builder/) configuration files. Azure Data API Builder generates REST and GraphQL APIs from your database without writing backend code.

## Features

- Configure database connections (SQL Server, PostgreSQL, MySQL, Cosmos DB)
- Define entities from database tables and views
- Set up role-based permissions
- Configure REST/GraphQL endpoints, CORS, and authentication
- Import database schema automatically
- Live JSON preview with download/copy functionality

## Tech Stack

- Angular 21
- TypeScript 5.9
- Bootstrap 5.3
- RxJS 7.8
- Vitest

## Prerequisites

- Node.js (v20 or later)
- npm 11.6.4 or compatible package manager

## Getting Started

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/danOIntellitect/IntelliTect-Sql-Mcp-Configuration.git
   cd IntelliTect-Sql-Mcp-Configuration
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

### Development Server

Start the local development server:

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`.

### Build

```bash
npm run build
```

Build artifacts are stored in the `dist/` directory.

## Project Structure

```text
src/
├── app/
│   ├── components/
│   ├── pages/
│   │   └── config-wizard/
│   ├── services/
│   ├── models/
│   ├── utils/
│   └── interceptors/
├── environments/
└── styles/
```

## Testing

```bash
npm test
```

## Resources

- [Azure Data API Builder Documentation](https://learn.microsoft.com/en-us/azure/data-api-builder/)
- [DAB Configuration Reference](https://learn.microsoft.com/en-us/azure/data-api-builder/configuration/)
- [Angular Documentation](https://angular.dev/)

## License

Developed by IntelliTect.
