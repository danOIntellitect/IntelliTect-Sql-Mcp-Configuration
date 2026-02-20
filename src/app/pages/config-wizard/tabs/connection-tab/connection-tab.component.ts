import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseType } from '../../../../models';
import { ConfigBuilderService } from '../../../../services/config-builder.service';

@Component({
  selector: 'app-connection-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="connection-tab">
      <!-- Data Source Section -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">
            <i class="bi bi-database me-2"></i>
            Data Source Configuration
          </h5>
        </div>
        <div class="card-body">
          <form [formGroup]="form">
            <div class="row">
              <div class="col-md-6 mb-3">
                <label for="databaseType" class="form-label">Database Type</label>
                <select
                  id="databaseType"
                  class="form-select"
                  formControlName="databaseType"
                  (change)="onDatabaseTypeChange()"
                >
                  @for (dbType of databaseTypes; track dbType.value) {
                    <option [value]="dbType.value">{{ dbType.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="mb-3">
              <label for="connectionString" class="form-label"> Connection String </label>
              <div class="input-group">
                <input
                  type="text"
                  id="connectionString"
                  class="form-control font-monospace"
                  formControlName="connectionString"
                  placeholder="@env('MSSQL_CONNECTION_STRING') or direct connection string"
                />
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  (click)="useEnvVariable()"
                  title="Use environment variable"
                >
                  <i class="bi bi-braces"></i>
                </button>
              </div>
              <small class="form-text text-muted">
                Use &#64;env('VARIABLE_NAME') to reference environment variables
              </small>
            </div>

            <!-- MSSQL Options -->
            @if (form.get('databaseType')?.value === 'mssql') {
              <div class="form-check mb-3">
                <input
                  type="checkbox"
                  id="setSessionContext"
                  class="form-check-input"
                  formControlName="setSessionContext"
                />
                <label for="setSessionContext" class="form-check-label">
                  Set Session Context
                </label>
                <small class="form-text text-muted d-block">
                  Enable sending data to SQL Server using session context
                </small>
              </div>
            }

            <!-- CosmosDB Options -->
            @if (form.get('databaseType')?.value === 'cosmosdb_nosql') {
              <div class="row">
                <div class="col-md-4 mb-3">
                  <label for="cosmosDatabase" class="form-label">Database</label>
                  <input
                    type="text"
                    id="cosmosDatabase"
                    class="form-control"
                    formControlName="cosmosDatabase"
                    placeholder="Database name"
                  />
                </div>
                <div class="col-md-4 mb-3">
                  <label for="cosmosContainer" class="form-label">Container</label>
                  <input
                    type="text"
                    id="cosmosContainer"
                    class="form-control"
                    formControlName="cosmosContainer"
                    placeholder="Container name"
                  />
                </div>
                <div class="col-md-4 mb-3">
                  <label for="cosmosSchema" class="form-label">GraphQL Schema Path</label>
                  <input
                    type="text"
                    id="cosmosSchema"
                    class="form-control"
                    formControlName="cosmosSchema"
                    placeholder="schema.gql"
                  />
                </div>
              </div>
            }
          </form>
        </div>
      </div>
    </div>
  `,
  styles: `
    .font-monospace {
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 0.9rem;
    }
  `,
})
export class ConnectionTabComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly configBuilder = inject(ConfigBuilderService);

  readonly databaseTypes: { value: DatabaseType; label: string }[] = [
    { value: 'mssql', label: 'Microsoft SQL Server' },
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'cosmosdb_nosql', label: 'Azure Cosmos DB (NoSQL)' },
    { value: 'cosmosdb_postgresql', label: 'Azure Cosmos DB (PostgreSQL)' },
  ];

  readonly form: FormGroup = this.fb.group({
    databaseType: ['mssql', Validators.required],
    connectionString: ['', Validators.required],
    setSessionContext: [true],
    cosmosDatabase: [''],
    cosmosContainer: [''],
    cosmosSchema: [''],
  });

  constructor() {
    // Initialize form with current config
    const ds = this.configBuilder.dataSource();
    this.form.patchValue({
      databaseType: ds['database-type'],
      connectionString: ds['connection-string'],
      setSessionContext: ds.options?.['set-session-context'] ?? true,
      cosmosDatabase: ds.options?.database ?? '',
      cosmosContainer: ds.options?.container ?? '',
      cosmosSchema: ds.options?.schema ?? '',
    });

    // Sync form changes to service
    this.form.valueChanges.subscribe((values) => {
      this.updateDataSource(values);
    });
  }

  onDatabaseTypeChange(): void {
    const dbType = this.form.get('databaseType')?.value as DatabaseType;
    this.configBuilder.setDatabaseType(dbType);
  }

  useEnvVariable(): void {
    const current = this.form.get('connectionString')?.value || '';
    if (!current.startsWith("@env('")) {
      const dbType = this.form.get('databaseType')?.value?.toUpperCase() || 'DATABASE';
      this.form.patchValue({
        connectionString: `@env('${dbType}_CONNECTION_STRING')`,
      });
    }
  }

  private updateDataSource(values: Record<string, unknown>): void {
    const dbType = values['databaseType'] as DatabaseType;

    let options: Record<string, unknown> | undefined;

    if (dbType === 'mssql') {
      options = { 'set-session-context': values['setSessionContext'] };
    } else if (dbType === 'cosmosdb_nosql') {
      options = {
        database: values['cosmosDatabase'],
        container: values['cosmosContainer'],
        schema: values['cosmosSchema'],
      };
    }

    this.configBuilder.setDataSource({
      'database-type': dbType,
      'connection-string': values['connectionString'] as string,
      options: options as
        | {
            'set-session-context'?: boolean;
            database?: string;
            container?: string;
            schema?: string;
          }
        | undefined,
    });
  }
}
