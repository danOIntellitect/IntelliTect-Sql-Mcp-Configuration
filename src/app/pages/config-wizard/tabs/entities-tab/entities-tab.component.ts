import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IEntitySource, IGeneratedEntity } from '../../../../models';
import { ConfigBuilderService } from '../../../../services/config-builder.service';
import { NotificationService } from '../../../../services/notification.service';
import { SchemaImporterService } from '../../../../services/schema-importer.service';

@Component({
  selector: 'app-entities-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="entities-tab">
      @if (configBuilder.entities().length === 0) {
        <!-- Empty State - Show Import Options -->
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-file-earmark-arrow-up me-2"></i>
              Import Database Schema
            </h5>
          </div>
          <div class="card-body">
            <p class="text-muted mb-4">
              Import your database schema to automatically generate entity configurations. All
              discovered tables will be configured with default settings that you can customize.
            </p>

            <div class="row g-3">
              <!-- JSON Import -->
              <div class="col-md-4">
                <div
                  class="import-option p-4 border rounded text-center h-100"
                  [class.active]="importMode() === 'json'"
                  (click)="selectImportMode('json')"
                >
                  <i class="bi bi-filetype-json display-4 text-primary mb-3 d-block"></i>
                  <h6>Import JSON File</h6>
                  <p class="text-muted small mb-0">Upload a JSON file with table definitions</p>
                </div>
              </div>

              <!-- SQL Import -->
              <div class="col-md-4">
                <div
                  class="import-option p-4 border rounded text-center h-100"
                  [class.active]="importMode() === 'sql'"
                  (click)="selectImportMode('sql')"
                >
                  <i class="bi bi-file-earmark-code display-4 text-success mb-3 d-block"></i>
                  <h6>Paste SQL</h6>
                  <p class="text-muted small mb-0">Paste CREATE TABLE statements</p>
                </div>
              </div>

              <!-- Manual Entry -->
              <div class="col-md-4">
                <div
                  class="import-option p-4 border rounded text-center h-100"
                  [class.active]="importMode() === 'manual'"
                  (click)="selectImportMode('manual')"
                >
                  <i class="bi bi-pencil-square display-4 text-warning mb-3 d-block"></i>
                  <h6>Manual Entry</h6>
                  <p class="text-muted small mb-0">Add entities manually one by one</p>
                </div>
              </div>
            </div>

            <!-- JSON File Upload -->
            @if (importMode() === 'json') {
              <div class="mt-4">
                <label for="jsonFile" class="form-label">Select JSON Schema File</label>
                <input
                  type="file"
                  id="jsonFile"
                  class="form-control"
                  accept=".json"
                  (change)="onFileSelected($event)"
                />
                <small class="form-text text-muted">
                  Expected format: &#123; "tables": [&#123; "name": "...", "schema": "...",
                  "columns": [...] &#125;] &#125;
                </small>
              </div>
            }

            <!-- SQL Paste -->
            @if (importMode() === 'sql') {
              <div class="mt-4">
                <label for="sqlInput" class="form-label">Paste CREATE TABLE Statements</label>
                <textarea
                  id="sqlInput"
                  class="form-control font-monospace"
                  rows="10"
                  placeholder="CREATE TABLE dbo.Users (
    Id INT PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME2
);"
                  [(ngModel)]="sqlInput"
                ></textarea>
                <button
                  type="button"
                  class="btn btn-primary mt-3"
                  [disabled]="!sqlInput()"
                  (click)="importSql()"
                >
                  <i class="bi bi-upload me-1"></i>
                  Parse and Import
                </button>
              </div>
            }

            <!-- Manual Entry -->
            @if (importMode() === 'manual') {
              <div class="mt-4 text-center">
                <button type="button" class="btn btn-primary" (click)="addEntity()">
                  <i class="bi bi-plus-lg me-1"></i>
                  Add Entity Manually
                </button>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="row">
          <!-- Entity List -->
          <div class="col-md-4 col-lg-3">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Entities</h6>
                <div class="d-flex gap-1">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    (click)="showImportModal.set(true)"
                    title="Import schema"
                  >
                    <i class="bi bi-file-earmark-arrow-up"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    (click)="addEntity()"
                  >
                    <i class="bi bi-plus"></i>
                  </button>
                </div>
              </div>
              <div class="list-group list-group-flush entity-list">
                @for (entity of configBuilder.entities(); track entity.id) {
                  <button
                    type="button"
                    class="list-group-item list-group-item-action d-flex align-items-center"
                    [class.active]="selectedEntityId() === entity.id"
                    (click)="selectEntity(entity.id)"
                  >
                    <div class="form-check me-2" (click)="$event.stopPropagation()">
                      <input
                        type="checkbox"
                        class="form-check-input"
                        [checked]="entity.enabled"
                        (change)="configBuilder.toggleEntity(entity.id)"
                      />
                    </div>
                    <div class="flex-grow-1">
                      <div [class.text-muted]="!entity.enabled">
                        {{ entity.name }}
                        @if (hasDuplicateName(entity)) {
                          <i
                            class="bi bi-exclamation-triangle-fill text-warning ms-1"
                            title="Duplicate entity name - please review"
                          ></i>
                        }
                      </div>
                      <small class="text-muted">
                        {{ entity.source.object }}
                        @if (hasDuplicateSourceObject(entity)) {
                          <i
                            class="bi bi-exclamation-triangle-fill text-warning ms-1"
                            title="Duplicate table/object reference - please review"
                          ></i>
                        }
                      </small>
                    </div>
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Entity Editor -->
          <div class="col-md-8 col-lg-9">
            @if (selectedEntity(); as entity) {
              <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <h5 class="mb-0">
                    <i class="bi bi-pencil me-2"></i>
                    Edit: {{ entity.name }}
                  </h5>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    (click)="deleteEntity(entity.id)"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                <div class="card-body">
                  <!-- Basic Info -->
                  <div class="row mb-4">
                    <div class="col-md-6 mb-3">
                      <label for="entityName" class="form-label">Entity Name</label>
                      <input
                        type="text"
                        id="entityName"
                        class="form-control"
                        [ngModel]="entity.name"
                        (ngModelChange)="updateEntityField('name', $event)"
                      />
                      <small class="form-text text-muted">
                        Used in API endpoints and GraphQL types
                      </small>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label for="description" class="form-label">
                        Description
                        <a
                          href="https://learn.microsoft.com/en-us/azure/data-api-builder/mcp/how-to-add-descriptions"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="ms-1 text-decoration-none"
                          title="Learn about entity descriptions"
                        >
                          <i class="bi bi-question-circle"></i>
                        </a>
                      </label>
                      <textarea
                        id="description"
                        class="form-control"
                        rows="2"
                        [ngModel]="entity.description"
                        (ngModelChange)="updateEntityField('description', $event)"
                        placeholder="Describe this entity for MCP tools and API documentation"
                      ></textarea>
                      <small class="form-text text-muted">
                        Descriptions are surfaced in MCP tools and generated API documentation
                      </small>
                    </div>
                  </div>

                  <!-- Source Configuration -->
                  <h6 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-database me-2"></i>
                    Source Configuration
                  </h6>
                  <div class="row mb-4">
                    <div class="col-md-6 mb-3">
                      <label for="sourceObject" class="form-label">Database Object</label>
                      <input
                        type="text"
                        id="sourceObject"
                        class="form-control font-monospace"
                        [ngModel]="entity.source.object"
                        (ngModelChange)="updateSourceField('object', $event)"
                        placeholder="schema.TableName"
                      />
                    </div>
                    <div class="col-md-6 mb-3">
                      <label for="sourceType" class="form-label">Object Type</label>
                      <select
                        id="sourceType"
                        class="form-select"
                        [ngModel]="entity.source.type"
                        (ngModelChange)="updateSourceField('type', $event)"
                      >
                        <option value="table">Table</option>
                        <option value="view">View</option>
                        <option value="stored-procedure">Stored Procedure</option>
                      </select>
                    </div>
                  </div>

                  <!-- API Configuration -->
                  <h6 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-globe me-2"></i>
                    API Configuration
                  </h6>
                  <div class="row mb-4">
                    <div class="col-md-4">
                      <div class="form-check form-switch">
                        <input
                          type="checkbox"
                          id="restEnabled"
                          class="form-check-input"
                          [ngModel]="entity.rest.enabled"
                          (ngModelChange)="updateRestField('enabled', $event)"
                        />
                        <label for="restEnabled" class="form-check-label"> REST API Enabled </label>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="form-check form-switch">
                        <input
                          type="checkbox"
                          id="graphqlEnabled"
                          class="form-check-input"
                          [ngModel]="entity.graphql.enabled"
                          (ngModelChange)="updateGraphqlField('enabled', $event)"
                        />
                        <label for="graphqlEnabled" class="form-check-label">
                          GraphQL Enabled
                        </label>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="form-check form-switch">
                        <input
                          type="checkbox"
                          id="mcpEnabled"
                          class="form-check-input"
                          [ngModel]="entity.mcp['dml-tools']"
                          (ngModelChange)="updateMcpField('dml-tools', $event)"
                        />
                        <label for="mcpEnabled" class="form-check-label"> MCP DML Tools </label>
                      </div>
                    </div>
                  </div>

                  <!-- Columns (if available) -->
                  @if (entity.columns.length > 0) {
                    <h6 class="border-bottom pb-2 mb-3">
                      <i class="bi bi-list-columns me-2"></i>
                      Columns
                      <button
                        type="button"
                        class="btn btn-sm btn-link ms-2"
                        (click)="toggleColumns()"
                      >
                        {{ showColumns() ? 'Hide' : 'Show' }}
                      </button>
                    </h6>
                    @if (showColumns()) {
                      <div class="table-responsive">
                        <table class="table table-sm table-bordered">
                          <thead class="table-light">
                            <tr>
                              <th>Column</th>
                              <th>Type</th>
                              <th>Nullable</th>
                              <th>Primary Key</th>
                              <th>Alias</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (col of entity.columns; track col.name) {
                              <tr>
                                <td class="font-monospace">{{ col.name }}</td>
                                <td>{{ col.type }}</td>
                                <td>
                                  @if (col.nullable) {
                                    <i class="bi bi-check-circle text-success"></i>
                                  } @else {
                                    <i class="bi bi-x-circle text-danger"></i>
                                  }
                                </td>
                                <td>
                                  @if (col.isPrimaryKey) {
                                    <i class="bi bi-key-fill text-warning"></i>
                                  }
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    class="form-control form-control-sm"
                                    [ngModel]="entity.mappings[col.name] || ''"
                                    (ngModelChange)="updateMapping(col.name, $event)"
                                    placeholder="(no alias)"
                                  />
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  }
                </div>
              </div>
            } @else {
              <div class="card">
                <div class="card-body text-center text-muted py-5">
                  <i class="bi bi-arrow-left display-4 mb-3 d-block"></i>
                  <p>Select an entity to edit its configuration</p>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .entity-list {
      max-height: 60vh;
      overflow-y: auto;
    }

    .entity-list .list-group-item {
      font-size: 0.9rem;
    }

    .entity-list .list-group-item small {
      font-size: 0.75rem;
    }

    .font-monospace {
      font-family: 'Fira Code', 'Consolas', monospace;
    }

    .import-option {
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .import-option:hover {
      border-color: var(--bs-primary) !important;
      background: var(--bs-light);
    }

    .import-option.active {
      border-color: var(--bs-primary) !important;
      background: rgba(var(--bs-primary-rgb), 0.1);
    }
  `,
})
export class EntitiesTabComponent {
  protected readonly configBuilder = inject(ConfigBuilderService);
  private readonly schemaImporter = inject(SchemaImporterService);
  private readonly notifications = inject(NotificationService);

  readonly selectedEntityId = signal<string | null>(null);
  readonly showColumns = signal(false);
  readonly importMode = signal<'json' | 'sql' | 'manual' | null>(null);
  readonly sqlInput = signal('');
  readonly showImportModal = signal(false);

  readonly selectedEntity = () => {
    const id = this.selectedEntityId();
    return id ? this.configBuilder.entities().find((e) => e.id === id) : null;
  };

  /** Computed map of entity names to count for duplicate detection */
  private readonly entityNameCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const entity of this.configBuilder.entities()) {
      const name = entity.name.trim().toLowerCase();
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return counts;
  });

  /** Computed map of source objects to count for duplicate detection */
  private readonly sourceObjectCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const entity of this.configBuilder.entities()) {
      const obj = entity.source.object.trim().toLowerCase();
      if (obj) {
        counts.set(obj, (counts.get(obj) || 0) + 1);
      }
    }
    return counts;
  });

  hasDuplicateName(entity: IGeneratedEntity): boolean {
    const name = entity.name.trim().toLowerCase();
    return (this.entityNameCounts().get(name) || 0) > 1;
  }

  hasDuplicateSourceObject(entity: IGeneratedEntity): boolean {
    const obj = entity.source.object.trim().toLowerCase();
    if (!obj) return false;
    return (this.sourceObjectCounts().get(obj) || 0) > 1;
  }

  selectEntity(id: string): void {
    this.selectedEntityId.set(id);
  }

  selectImportMode(mode: 'json' | 'sql' | 'manual'): void {
    this.importMode.set(this.importMode() === mode ? null : mode);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      const entities = await this.schemaImporter.importAndGenerate(file);
      this.notifications.success(`Imported ${entities.length} entities`);
      this.importMode.set(null);
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Failed to import schema');
    }
  }

  importSql(): void {
    const sql = this.sqlInput();
    if (!sql.trim()) return;

    try {
      const entities = this.schemaImporter.importSqlAndGenerate(sql);
      if (entities.length === 0) {
        this.notifications.warning('No tables found in SQL. Check the format.');
        return;
      }
      this.notifications.success(`Imported ${entities.length} entities`);
      this.sqlInput.set('');
      this.importMode.set(null);
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Failed to parse SQL');
    }
  }

  addEntity(): void {
    const entity = this.schemaImporter.createEmptyEntity();
    this.configBuilder.addEntity(entity);
    this.selectedEntityId.set(entity.id);
  }

  deleteEntity(id: string): void {
    if (confirm('Are you sure you want to delete this entity?')) {
      this.configBuilder.removeEntity(id);
      if (this.selectedEntityId() === id) {
        const remaining = this.configBuilder.entities();
        this.selectedEntityId.set(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  }

  toggleColumns(): void {
    this.showColumns.update((v) => !v);
  }

  updateEntityField(field: keyof IGeneratedEntity, value: unknown): void {
    const id = this.selectedEntityId();
    if (id) {
      this.configBuilder.updateEntity(id, { [field]: value });
    }
  }

  updateSourceField(field: keyof IEntitySource, value: unknown): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const updatedSource = { ...entity.source, [field]: value };
    this.configBuilder.updateEntity(entity.id, { source: updatedSource as IEntitySource });
  }

  updateRestField(field: string, value: unknown): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const updatedRest = { ...entity.rest, [field]: value };
    this.configBuilder.updateEntity(entity.id, { rest: updatedRest });
  }

  updateGraphqlField(field: string, value: unknown): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const updatedGraphql = { ...entity.graphql, [field]: value };
    this.configBuilder.updateEntity(entity.id, { graphql: updatedGraphql });
  }

  updateMcpField(field: string, value: unknown): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const updatedMcp = { ...entity.mcp, [field]: value };
    this.configBuilder.updateEntity(entity.id, { mcp: updatedMcp });
  }

  updateMapping(columnName: string, alias: string): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const updatedMappings = { ...entity.mappings };
    if (alias.trim()) {
      updatedMappings[columnName] = alias;
    } else {
      delete updatedMappings[columnName];
    }
    this.configBuilder.updateEntity(entity.id, { mappings: updatedMappings });
  }
}
