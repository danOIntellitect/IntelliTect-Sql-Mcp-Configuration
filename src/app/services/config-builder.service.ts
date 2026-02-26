import { Injectable, computed, signal } from '@angular/core';
import {
  DatabaseType,
  IDabConfig,
  IDataSourceConfig,
  IEntityConfig,
  IGeneratedEntity,
  IGraphQLConfig,
  IHostConfig,
  IMcpConfig,
  IPaginationConfig,
  IRestConfig,
  IRuntimeConfig,
} from '../models';

/**
 * Service for building and managing DAB configuration state
 */
@Injectable({ providedIn: 'root' })
export class ConfigBuilderService {
  // Data source state
  readonly dataSource = signal<IDataSourceConfig>({
    'database-type': 'mssql',
    'connection-string': '',
  });

  // Runtime configuration state
  readonly restConfig = signal<IRestConfig>({
    enabled: true,
    path: '/api',
    'request-body-strict': true,
  });

  readonly graphqlConfig = signal<IGraphQLConfig>({
    enabled: false,
    path: '/graphql',
    'allow-introspection': true,
  });

  readonly mcpConfig = signal<IMcpConfig>({
    enabled: true,
    path: '/mcp',
    'dml-tools': {
      'describe-entities': true,
      'create-record': true,
      'read-records': true,
      'update-record': false,
      'delete-record': false,
      'execute-entity': false,
    },
  });

  readonly hostConfig = signal<IHostConfig>({
    cors: {
      origins: ['*'],
      'allow-credentials': false,
    },
    mode: 'development',
  });

  readonly paginationConfig = signal<IPaginationConfig>({
    'max-page-size': null,
    'default-page-size': null,
    'next-link-relative': false,
  });

  // Entities state
  readonly entities = signal<IGeneratedEntity[]>([]);

  // Computed: Build complete configuration
  readonly config = computed<IDabConfig>(() => this.buildConfig());

  // Computed: JSON string output
  readonly configJson = computed(() => JSON.stringify(this.buildConfig(), null, 2));

  // Preview panel visibility
  readonly previewOpen = signal(false);

  /**
   * Set data source configuration
   */
  setDataSource(config: Partial<IDataSourceConfig>): void {
    this.dataSource.update((current) => ({ ...current, ...config }));
  }

  /**
   * Set database type with appropriate defaults
   */
  setDatabaseType(type: DatabaseType): void {
    const options = type === 'mssql' ? { 'set-session-context': true } : undefined;
    const cosmosOptions =
      type === 'cosmosdb_nosql' ? { database: '', schema: '', container: '' } : undefined;

    this.dataSource.update((current) => ({
      ...current,
      'database-type': type,
      options: options || cosmosOptions,
    }));
  }

  /**
   * Add a new entity
   */
  addEntity(entity: IGeneratedEntity): void {
    this.entities.update((list) => [...list, entity]);
  }

  /**
   * Update an existing entity
   */
  updateEntity(id: string, updates: Partial<IGeneratedEntity>): void {
    this.entities.update((list) => list.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }

  /**
   * Remove an entity
   */
  removeEntity(id: string): void {
    this.entities.update((list) => list.filter((e) => e.id !== id));
  }

  /**
   * Toggle entity enabled state
   */
  toggleEntity(id: string): void {
    this.entities.update((list) =>
      list.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)),
    );
  }

  /**
   * Set all entities from import
   */
  setEntities(entities: IGeneratedEntity[]): void {
    this.entities.set(entities);
  }

  /**
   * Update REST configuration
   */
  setRestConfig(config: Partial<IRestConfig>): void {
    this.restConfig.update((current) => ({ ...current, ...config }));
  }

  /**
   * Update GraphQL configuration
   */
  setGraphQLConfig(config: Partial<IGraphQLConfig>): void {
    this.graphqlConfig.update((current) => ({ ...current, ...config }));
  }

  /**
   * Update MCP configuration
   */
  setMcpConfig(config: Partial<IMcpConfig>): void {
    this.mcpConfig.update((current) => ({ ...current, ...config }));
  }

  /**
   * Update Host configuration
   */
  setHostConfig(config: Partial<IHostConfig>): void {
    this.hostConfig.update((current) => ({ ...current, ...config }));
  }

  /**
   * Update Pagination configuration
   */
  setPaginationConfig(config: Partial<IPaginationConfig>): void {
    this.paginationConfig.update((current) => ({ ...current, ...config }));
  }

  /**
   * Toggle preview panel
   */
  togglePreview(): void {
    this.previewOpen.update((open) => !open);
  }

  /**
   * Build complete DAB configuration object
   */
  buildConfig(): IDabConfig {
    const enabledEntities = this.entities().filter((e) => e.enabled);

    const entitiesConfig: Record<string, IEntityConfig> = {};
    for (const entity of enabledEntities) {
      entitiesConfig[entity.name] = this.buildEntityConfig(entity);
    }

    // Build host config, excluding authentication if not configured or set to 'None'
    const hostConfig = this.hostConfig();
    const cleanedHostConfig: IHostConfig = {
      cors: hostConfig.cors,
      mode: hostConfig.mode,
    };

    // Only include authentication if it exists and provider is not 'None'
    if (hostConfig.authentication && hostConfig.authentication.provider !== 'None') {
      cleanedHostConfig.authentication = hostConfig.authentication;
    }

    // Build pagination config, only include if values are set
    const paginationConfig = this.paginationConfig();
    const hasPaginationConfig =
      paginationConfig['max-page-size'] !== null ||
      paginationConfig['default-page-size'] !== null ||
      paginationConfig['next-link-relative'] === true;

    const runtime: IRuntimeConfig = {
      rest: this.restConfig(),
      graphql: this.graphqlConfig(),
      mcp: this.mcpConfig(),
      host: cleanedHostConfig,
    };

    // Only include pagination if configured
    if (hasPaginationConfig) {
      runtime.pagination = paginationConfig;
    }

    return {
      $schema:
        'https://github.com/Azure/data-api-builder/releases/latest/download/dab.draft.schema.json',
      'data-source': this.dataSource(),
      runtime,
      entities: entitiesConfig,
    };
  }

  /**
   * Build entity configuration from generated entity
   */
  private buildEntityConfig(entity: IGeneratedEntity): IEntityConfig {
    const config: IEntityConfig = {
      source: entity.source,
      description: entity.description || undefined,
      permissions: entity.permissions,
    };

    // Add REST config if customized
    if (entity.rest) {
      config.rest = entity.rest;
    }

    // Add GraphQL config if customized
    if (entity.graphql) {
      config.graphql = entity.graphql;
    }

    // Add MCP config if customized
    if (entity.mcp) {
      config.mcp = entity.mcp;
    }

    // Add fields if columns have descriptions or are primary keys
    if (entity.columns && entity.columns.length > 0) {
      const fields = entity.columns
        .map((col) => {
          const field: { name: string; description?: string; 'primary-key'?: boolean } = {
            name: col.name,
          };

          if (col.description && col.description.trim()) {
            field.description = col.description.trim();
          }

          if (col.isPrimaryKey) {
            field['primary-key'] = true;
          }

          // Only include fields that have a description or are primary keys
          return col.description?.trim() || col.isPrimaryKey ? field : null;
        })
        .filter((field) => field !== null) as Array<{
        name: string;
        description?: string;
        'primary-key'?: boolean;
      }>;

      if (fields.length > 0) {
        config.fields = fields;
      }
    }

    return config;
  }

  /**
   * Copy configuration JSON to clipboard
   */
  async copyToClipboard(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(this.configJson());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download configuration as JSON file
   */
  downloadAsFile(filename = 'dab-config.json'): void {
    const json = this.configJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Reset all configuration to defaults
   */
  reset(): void {
    this.dataSource.set({
      'database-type': 'mssql',
      'connection-string': '',
    });
    this.entities.set([]);
    this.restConfig.set({
      enabled: true,
      path: '/api',
      'request-body-strict': true,
    });
    this.graphqlConfig.set({
      enabled: false,
      path: '/graphql',
      'allow-introspection': true,
    });
    this.mcpConfig.set({
      enabled: true,
      path: '/mcp',
      'dml-tools': {
        'describe-entities': true,
        'create-record': true,
        'read-records': true,
        'update-record': false,
        'delete-record': false,
        'execute-entity': false,
      },
    });
    this.hostConfig.set({
      cors: {
        origins: ['*'],
        'allow-credentials': false,
      },
      mode: 'development',
    });
    this.paginationConfig.set({
      'max-page-size': null,
      'default-page-size': null,
      'next-link-relative': false,
    });
  }
}
