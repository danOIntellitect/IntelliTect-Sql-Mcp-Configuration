import { Injectable, inject } from '@angular/core';
import {
  IColumnInfo,
  IDatabaseSchema,
  IEntityGraphQLConfig,
  IEntityMcpConfig,
  IEntityRestConfig,
  IEntitySource,
  IGeneratedEntity,
  IPermission,
  IRelationship,
  ITableInfo,
} from '../models';
import { ConfigBuilderService } from './config-builder.service';

/**
 * Service for importing and parsing database schemas
 */
@Injectable({ providedIn: 'root' })
export class SchemaImporterService {
  private readonly configBuilder = inject(ConfigBuilderService);

  /**
   * Parse a JSON file containing database schema
   * Expected format: { tables: [{ name, schema, columns: [{ name, type, nullable, isPrimaryKey }] }] }
   */
  async parseJsonFile(file: File): Promise<IDatabaseSchema> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          const schema = this.normalizeSchema(parsed);
          resolve(schema);
        } catch (error) {
          reject(new Error('Invalid JSON file format'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse SQL CREATE TABLE statements to extract schema
   */
  parseSqlStatements(sql: string): IDatabaseSchema {
    const tables: ITableInfo[] = [];

    // Match CREATE TABLE statements
    const tableRegex =
      /CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([\s\S]*?)\)(?:\s*;|\s*GO|\s*$)/gi;

    let match: RegExpExecArray | null;
    while ((match = tableRegex.exec(sql)) !== null) {
      const schema = match[1] || 'dbo';
      const tableName = match[2];
      const columnsBlock = match[3];

      const columns = this.parseColumnsFromSql(columnsBlock, tableName);

      if (tableName && columns.length > 0) {
        tables.push({
          name: tableName,
          schema,
          columns,
        });
      }
    }

    return { tables };
  }

  /**
   * Parse column definitions from SQL
   */
  private parseColumnsFromSql(columnsBlock: string, tableName: string): IColumnInfo[] {
    const columns: IColumnInfo[] = [];
    const primaryKeys: string[] = [];
    const foreignKeys = new Map<string, { entity: string; field: string }>();

    // First, find PRIMARY KEY constraints
    const pkRegex = /PRIMARY\s+KEY\s*\(([^)]+)\)/gi;
    let pkMatch: RegExpExecArray | null;
    while ((pkMatch = pkRegex.exec(columnsBlock)) !== null) {
      const pkCols = pkMatch[1].split(',').map((c) => c.trim().replace(/[\[\]]/g, ''));
      primaryKeys.push(...pkCols);
    }

    // Find FOREIGN KEY constraints
    // Pattern: FOREIGN KEY (ColumnName) REFERENCES TableName(ReferencedColumn)
    const fkRegex =
      /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([^)]+)\)/gi;
    let fkMatch: RegExpExecArray | null;
    while ((fkMatch = fkRegex.exec(columnsBlock)) !== null) {
      const sourceColumn = fkMatch[1].trim().replace(/[\[\]]/g, '');
      const referencedTable = fkMatch[3];
      const referencedColumn = fkMatch[4].trim().replace(/[\[\]]/g, '');

      // Generate entity name from table name (simple singularization)
      const entityName = this.tableNameToEntityName(referencedTable);

      foreignKeys.set(sourceColumn, {
        entity: entityName,
        field: referencedColumn,
      });
    }

    // Parse individual columns
    const lines = columnsBlock.split(',');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip constraints
      if (/^\s*(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)/i.test(trimmed)) {
        continue;
      }

      // Match column definition: [ColumnName] DataType [NULL|NOT NULL] [PRIMARY KEY] [IDENTITY]
      // Also check for inline FOREIGN KEY: REFERENCES TableName(Column)
      const colRegex =
        /^\[?(\w+)\]?\s+(\w+(?:\s*\([^)]+\))?)\s*(NULL|NOT\s+NULL)?\s*(PRIMARY\s+KEY)?\s*(IDENTITY)?(?:\s+REFERENCES\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([^)]+)\))?/i;
      const colMatch = colRegex.exec(trimmed);

      if (colMatch) {
        const colName = colMatch[1];
        const colType = colMatch[2];
        const nullability = colMatch[3];
        const isPkInline = !!colMatch[4];

        // Check for inline FOREIGN KEY reference
        const inlineRefTable = colMatch[7];
        const inlineRefColumn = colMatch[8];

        let foreignKey: { entity: string; field: string } | undefined = undefined;

        if (inlineRefTable && inlineRefColumn) {
          // Inline foreign key reference
          const entityName = this.tableNameToEntityName(inlineRefTable);
          foreignKey = {
            entity: entityName,
            field: inlineRefColumn.trim().replace(/[\[\]]/g, ''),
          };
        } else if (foreignKeys.has(colName)) {
          // Foreign key defined in constraint
          foreignKey = foreignKeys.get(colName);
        }

        columns.push({
          name: colName,
          type: this.normalizeDataType(colType),
          nullable: nullability ? !/NOT\s+NULL/i.test(nullability) : true,
          isPrimaryKey: isPkInline || primaryKeys.includes(colName),
          foreignKey,
        });
      }
    }

    return columns;
  }

  /**
   * Convert table name to entity name (simple singularization)
   */
  private tableNameToEntityName(tableName: string): string {
    let name = tableName;

    // Remove common suffixes and convert to singular
    if (name.endsWith('ies')) {
      name = name.slice(0, -3) + 'y';
    } else if (name.endsWith('es') && !name.endsWith('ses')) {
      name = name.slice(0, -2);
    } else if (name.endsWith('s') && !name.endsWith('ss')) {
      name = name.slice(0, -1);
    }

    // Ensure PascalCase
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Normalize SQL data type to a simpler form
   */
  private normalizeDataType(sqlType: string): string {
    const type = sqlType.toLowerCase().replace(/\s+/g, '');

    if (
      type.startsWith('int') ||
      type.startsWith('bigint') ||
      type.startsWith('smallint') ||
      type.startsWith('tinyint')
    ) {
      return 'int';
    }
    if (
      type.startsWith('varchar') ||
      type.startsWith('nvarchar') ||
      type.startsWith('char') ||
      type.startsWith('nchar')
    ) {
      return 'string';
    }
    if (
      type.startsWith('decimal') ||
      type.startsWith('numeric') ||
      type.startsWith('money') ||
      type.startsWith('float') ||
      type.startsWith('real')
    ) {
      return 'decimal';
    }
    if (type.startsWith('datetime') || type.startsWith('date') || type.startsWith('time')) {
      return 'datetime';
    }
    if (type.startsWith('bit')) {
      return 'boolean';
    }
    if (type.startsWith('uniqueidentifier')) {
      return 'guid';
    }

    return sqlType;
  }

  /**
   * Normalize imported schema to standard format
   */
  private normalizeSchema(data: unknown): IDatabaseSchema {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid schema format');
    }

    const obj = data as Record<string, unknown>;

    // Handle direct tables array
    if (Array.isArray(obj['tables'])) {
      return {
        tables: (obj['tables'] as unknown[]).map((t: unknown) => this.normalizeTable(t)),
      };
    }

    // Handle tables as object keys
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const tables: ITableInfo[] = [];
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          const table = this.normalizeTable({ ...(value as Record<string, unknown>), name: key });
          tables.push(table);
        }
      }
      if (tables.length > 0) {
        return { tables };
      }
    }

    throw new Error('Could not parse schema format');
  }

  /**
   * Normalize a single table definition
   */
  private normalizeTable(data: unknown): ITableInfo {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid table format');
    }

    const obj = data as Record<string, unknown>;
    const name = String(obj['name'] || obj['tableName'] || obj['TABLE_NAME'] || 'Unknown');
    const schema = String(obj['schema'] || obj['tableSchema'] || obj['TABLE_SCHEMA'] || 'dbo');

    let columns: IColumnInfo[] = [];

    if (Array.isArray(obj['columns'])) {
      columns = (obj['columns'] as unknown[]).map((c: unknown) => this.normalizeColumn(c));
    } else if (Array.isArray(obj['fields'])) {
      columns = (obj['fields'] as unknown[]).map((c: unknown) => this.normalizeColumn(c));
    }

    return { name, schema, columns };
  }

  /**
   * Normalize a single column definition
   */
  private normalizeColumn(data: unknown): IColumnInfo {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid column format');
    }

    const obj = data as Record<string, unknown>;

    return {
      name: String(obj['name'] || obj['columnName'] || obj['COLUMN_NAME'] || 'unknown'),
      type: String(obj['type'] || obj['dataType'] || obj['DATA_TYPE'] || 'string'),
      nullable: obj['nullable'] !== false && obj['IS_NULLABLE'] !== 'NO',
      isPrimaryKey:
        obj['isPrimaryKey'] === true ||
        obj['is_primary_key'] === true ||
        obj['PRIMARY_KEY'] === true,
      maxLength: typeof obj['maxLength'] === 'number' ? obj['maxLength'] : undefined,
      defaultValue: typeof obj['defaultValue'] === 'string' ? obj['defaultValue'] : undefined,
      description: typeof obj['description'] === 'string' ? obj['description'] : undefined,
    };
  }

  /**
   * Generate entity name from table info
   * e.g., "dbo.Users" -> "User", "sales.OrderItems" -> "SalesOrderItem"
   */
  generateEntityName(table: ITableInfo): string {
    let name = table.name;

    // Remove common suffixes and convert to singular
    if (name.endsWith('ies')) {
      name = name.slice(0, -3) + 'y';
    } else if (name.endsWith('es') && !name.endsWith('ses')) {
      name = name.slice(0, -2);
    } else if (name.endsWith('s') && !name.endsWith('ss')) {
      name = name.slice(0, -1);
    }

    // Prefix with schema if not 'dbo'
    if (table.schema && table.schema.toLowerCase() !== 'dbo') {
      const schemaPrefix = table.schema.charAt(0).toUpperCase() + table.schema.slice(1);
      name = schemaPrefix + name;
    }

    // Ensure PascalCase
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Generate default permissions (authenticated read-only)
   */
  generateDefaultPermissions(): IPermission[] {
    return [
      {
        role: 'authenticated',
        actions: ['read'],
      },
    ];
  }

  /**
   * Generate entities from imported schema with full automation
   */
  generateEntities(schema: IDatabaseSchema): IGeneratedEntity[] {
    const entities = schema.tables.map((table) => this.generateEntity(table));

    // Auto-generate relationships from foreign keys
    this.generateRelationshipsFromForeignKeys(entities);

    return entities;
  }

  /**
   * Auto-generate relationships from foreign key definitions across all entities
   */
  private generateRelationshipsFromForeignKeys(entities: IGeneratedEntity[]): void {
    for (const entity of entities) {
      const relationships: Record<string, IRelationship> = {};

      // Find all foreign key columns
      for (const column of entity.columns) {
        if (!column.foreignKey || !column.foreignKey.entity || !column.foreignKey.field) {
          continue;
        }

        // Generate relationship name based on the target entity
        const targetEntity = column.foreignKey.entity;
        let relationshipName = targetEntity.charAt(0).toLowerCase() + targetEntity.slice(1);

        // Ensure unique relationship name
        let counter = 1;
        let uniqueName = relationshipName;
        while (relationships[uniqueName]) {
          uniqueName = `${relationshipName}${counter}`;
          counter++;
        }

        // Create the relationship
        const relationship: IRelationship = {
          cardinality: 'one',
          'target.entity': targetEntity,
          'source.fields': [column.name],
          'target.fields': [column.foreignKey.field],
        };

        relationships[uniqueName] = relationship;
      }

      // Assign generated relationships to entity
      entity.relationships = relationships;
    }
  }

  /**
   * Generate a single entity from table info
   */
  generateEntity(table: ITableInfo): IGeneratedEntity {
    const name = this.generateEntityName(table);
    const primaryKeys = table.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);

    const source: IEntitySource = {
      object: `${table.schema}.${table.name}`,
      type: 'table',
    };

    // Add key-fields if we found primary keys
    if (primaryKeys.length > 0) {
      source['key-fields'] = primaryKeys;
    }

    const rest: IEntityRestConfig = {
      enabled: true,
    };

    const graphql: IEntityGraphQLConfig = {
      enabled: true,
    };

    const mcp: IEntityMcpConfig = {
      'dml-tools': true,
    };

    return {
      id: crypto.randomUUID(),
      name,
      enabled: true,
      source,
      description: `${table.name} records from ${table.schema} schema`,
      permissions: this.generateDefaultPermissions(),
      rest,
      graphql,
      mcp,
      columns: table.columns,
      mappings: {},
      relationships: {},
    };
  }

  /**
   * Create an empty entity for manual entry
   */
  createEmptyEntity(): IGeneratedEntity {
    return {
      id: crypto.randomUUID(),
      name: 'NewEntity',
      enabled: true,
      source: {
        object: 'dbo.TableName',
        type: 'table',
      },
      description: '',
      permissions: this.generateDefaultPermissions(),
      rest: { enabled: true },
      graphql: { enabled: true },
      mcp: { 'dml-tools': true },
      columns: [],
      mappings: {},
      relationships: {},
    };
  }

  /**
   * Import schema and auto-generate entities
   */
  async importAndGenerate(file: File): Promise<IGeneratedEntity[]> {
    const schema = await this.parseJsonFile(file);
    const entities = this.generateEntities(schema);
    this.configBuilder.setEntities(entities);
    return entities;
  }

  /**
   * Import SQL and auto-generate entities
   */
  importSqlAndGenerate(sql: string): IGeneratedEntity[] {
    const schema = this.parseSqlStatements(sql);
    const entities = this.generateEntities(schema);
    this.configBuilder.setEntities(entities);
    return entities;
  }
}
