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

    const runtime: IRuntimeConfig = {
      rest: this.restConfig(),
      graphql: this.graphqlConfig(),
      mcp: this.mcpConfig(),
      host: this.hostConfig(),
    };

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

    // Add mappings if present
    if (entity.mappings && Object.keys(entity.mappings).length > 0) {
      config.mappings = entity.mappings;
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
  }
}
