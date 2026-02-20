/**
 * Modal configuration interface
 */
export interface IModalConfig {
  title?: string;
  size?: 'sm' | 'lg' | 'xl';
  backdrop?: boolean | 'static';
  keyboard?: boolean;
  centered?: boolean;
}

/**
 * Notification interface
 */
export interface INotification {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  dismissible?: boolean;
}

/**
 * Navigation item interface
 */
export interface INavigationItem {
  label: string;
  route: string;
  icon?: string;
  children?: INavigationItem[];
}

/**
 * Loading state interface
 */
export interface ILoadingState {
  isLoading: boolean;
  message?: string;
}

// ============================================
// DAB Configuration Interfaces
// ============================================

/**
 * Database types supported by Data API Builder
 */
export type DatabaseType =
  | 'mssql'
  | 'postgresql'
  | 'mysql'
  | 'cosmosdb_nosql'
  | 'cosmosdb_postgresql';

/**
 * Authentication providers supported by DAB
 */
export type AuthProvider =
  | 'None'
  | 'StaticWebApps'
  | 'EntraID'
  | 'Simulator'
  | 'AppService'
  | 'AzureAD'
  | 'Custom';

/**
 * Entity source types
 */
export type EntitySourceType = 'table' | 'view' | 'stored-procedure';

/**
 * Permission actions
 */
export type PermissionAction = '*' | 'create' | 'read' | 'update' | 'delete' | 'execute';

/**
 * Host mode
 */
export type HostMode = 'production' | 'development';

/**
 * Data source configuration
 */
export interface IDataSourceConfig {
  'database-type': DatabaseType;
  'connection-string': string;
  options?: {
    'set-session-context'?: boolean;
    database?: string;
    container?: string;
    schema?: string;
  };
}

/**
 * REST runtime configuration
 */
export interface IRestConfig {
  enabled: boolean;
  path: string;
  'request-body-strict'?: boolean;
}

/**
 * GraphQL runtime configuration
 */
export interface IGraphQLConfig {
  enabled: boolean;
  path?: string;
  'allow-introspection'?: boolean;
  'depth-limit'?: number | null;
}

/**
 * MCP DML tools configuration
 */
export interface IMcpDmlTools {
  'describe-entities': boolean;
  'create-record': boolean;
  'read-records': boolean;
  'update-record': boolean;
  'delete-record': boolean;
  'execute-entity': boolean;
}

/**
 * MCP runtime configuration
 */
export interface IMcpConfig {
  enabled: boolean;
  path: string;
  'dml-tools': IMcpDmlTools | boolean;
}

/**
 * JWT configuration for authentication
 */
export interface IJwtConfig {
  audience: string;
  issuer: string;
}

/**
 * Authentication configuration
 */
export interface IAuthConfig {
  provider: AuthProvider;
  jwt?: IJwtConfig;
}

/**
 * CORS configuration
 */
export interface ICorsConfig {
  origins: string[];
  'allow-credentials': boolean;
}

/**
 * Host runtime configuration
 */
export interface IHostConfig {
  cors?: ICorsConfig;
  authentication?: IAuthConfig;
  mode?: HostMode;
}

/**
 * Telemetry configuration
 */
export interface ITelemetryConfig {
  'application-insights'?: {
    enabled: boolean;
    'connection-string': string;
  };
}

/**
 * Runtime configuration
 */
export interface IRuntimeConfig {
  rest?: IRestConfig;
  graphql?: IGraphQLConfig;
  mcp?: IMcpConfig;
  host?: IHostConfig;
  telemetry?: ITelemetryConfig;
}

/**
 * Entity source configuration
 */
export interface IEntitySource {
  object: string;
  type: EntitySourceType;
  'key-fields'?: string[];
  parameters?: Array<{
    name: string;
    required?: boolean;
    default?: string | number | boolean | null;
    description?: string;
  }>;
}

/**
 * Permission configuration for an entity
 */
export interface IPermission {
  role: string;
  actions: PermissionAction[] | '*';
}

/**
 * Entity REST configuration
 */
export interface IEntityRestConfig {
  enabled?: boolean;
  path?: string;
  methods?: Array<'get' | 'post' | 'put' | 'patch' | 'delete'>;
}

/**
 * Entity GraphQL configuration
 */
export interface IEntityGraphQLConfig {
  enabled?: boolean;
  type?: string | { singular: string; plural?: string };
  operation?: 'mutation' | 'query';
}

/**
 * Entity MCP configuration
 */
export interface IEntityMcpConfig {
  'dml-tools'?: boolean;
  'custom-tool'?: boolean;
}

/**
 * Relationship configuration
 */
export interface IRelationship {
  cardinality: 'one' | 'many';
  'target.entity': string;
  'source.fields'?: string[];
  'target.fields'?: string[];
  'linking.object'?: string;
  'linking.source.fields'?: string[];
  'linking.target.fields'?: string[];
}

/**
 * Entity configuration
 */
export interface IEntityConfig {
  source: IEntitySource | string;
  description?: string;
  permissions: IPermission[];
  rest?: IEntityRestConfig | boolean;
  graphql?: IEntityGraphQLConfig | boolean;
  mcp?: IEntityMcpConfig | boolean;
  mappings?: Record<string, string>;
  relationships?: Record<string, IRelationship>;
}

/**
 * Complete DAB configuration
 */
export interface IDabConfig {
  $schema?: string;
  'data-source': IDataSourceConfig;
  runtime?: IRuntimeConfig;
  entities: Record<string, IEntityConfig>;
}

// ============================================
// Schema Import Interfaces
// ============================================

/**
 * Column information from database schema
 */
export interface IColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  maxLength?: number;
  defaultValue?: string;
}

/**
 * Table information from database schema
 */
export interface ITableInfo {
  name: string;
  schema: string;
  columns: IColumnInfo[];
}

/**
 * Database schema structure
 */
export interface IDatabaseSchema {
  tables: ITableInfo[];
}

/**
 * Permission warning types
 */
export type PermissionWarningType =
  | 'anonymous-role'
  | 'anonymous-action'
  | 'authenticated-create'
  | 'authenticated-update'
  | 'authenticated-delete'
  | 'authenticated-all';

/**
 * Permission warning configuration
 */
export interface IPermissionWarning {
  type: PermissionWarningType;
  title: string;
  message: string;
  suggestion: string;
}

/**
 * Wizard tab identifiers
 */
export type WizardTab = 'connection' | 'entities' | 'permissions' | 'runtime';

/**
 * Generated entity for editing
 */
export interface IGeneratedEntity {
  id: string;
  name: string;
  enabled: boolean;
  source: IEntitySource;
  description: string;
  permissions: IPermission[];
  rest: IEntityRestConfig;
  graphql: IEntityGraphQLConfig;
  mcp: IEntityMcpConfig;
  columns: IColumnInfo[];
  mappings: Record<string, string>;
}
