import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IColumnInfo, IEntitySource, IGeneratedEntity, IRelationship } from '../../../../models';
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

                  <!-- Relationships -->
                  <h6 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-diagram-3 me-2"></i>
                    Relationships
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary ms-2"
                      (click)="addRelationship()"
                    >
                      <i class="bi bi-plus"></i>
                      Add Relationship
                    </button>
                    <a
                      href="https://learn.microsoft.com/en-us/azure/data-api-builder/configuration/entities#relationships-entity-name-entities"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="ms-2 text-decoration-none"
                      title="Learn about relationships"
                    >
                      <i class="bi bi-question-circle"></i>
                    </a>
                  </h6>
                  <div class="mb-4">
                    @if (getRelationshipKeys().length > 0) {
                      @for (relKey of getRelationshipKeys(); track relKey) {
                        <div class="card mb-3">
                          <div
                            class="card-header d-flex justify-content-between align-items-center"
                          >
                            <strong class="font-monospace">{{ relKey }}</strong>
                            <button
                              type="button"
                              class="btn btn-sm btn-outline-danger"
                              (click)="removeRelationship(relKey)"
                              title="Remove relationship"
                            >
                              <i class="bi bi-trash"></i>
                            </button>
                          </div>
                          <div class="card-body">
                            <div class="row">
                              <div class="col-md-6 mb-3">
                                <label class="form-label">Relationship Name</label>
                                <input
                                  type="text"
                                  class="form-control font-monospace"
                                  [ngModel]="relKey"
                                  (ngModelChange)="renameRelationship(relKey, $event)"
                                  placeholder="books, author, orderItems"
                                />
                              </div>
                              <div class="col-md-3 mb-3">
                                <label class="form-label">Cardinality</label>
                                <select
                                  class="form-select"
                                  [ngModel]="getRelationship(relKey)?.cardinality"
                                  (ngModelChange)="
                                    updateRelationshipField(relKey, 'cardinality', $event)
                                  "
                                >
                                  <option value="one">One</option>
                                  <option value="many">Many</option>
                                </select>
                              </div>
                              <div class="col-md-3 mb-3">
                                <label class="form-label">Target Entity</label>
                                <input
                                  type="text"
                                  class="form-control"
                                  [ngModel]="getRelationship(relKey)?.['target.entity']"
                                  (ngModelChange)="
                                    updateRelationshipField(relKey, 'target.entity', $event)
                                  "
                                  placeholder="Book, Author"
                                />
                              </div>
                            </div>
                            <div class="row">
                              <div class="col-md-6 mb-3">
                                <label class="form-label">
                                  Source Fields
                                  <small class="text-muted">(comma-separated)</small>
                                </label>
                                <input
                                  type="text"
                                  class="form-control font-monospace"
                                  [ngModel]="
                                    (getRelationship(relKey)?.['source.fields'] || []).join(', ')
                                  "
                                  (ngModelChange)="
                                    updateRelationshipFields(relKey, 'source.fields', $event)
                                  "
                                  placeholder="AuthorId, PublisherId"
                                />
                              </div>
                              <div class="col-md-6 mb-3">
                                <label class="form-label">
                                  Target Fields
                                  <small class="text-muted">(comma-separated)</small>
                                </label>
                                <input
                                  type="text"
                                  class="form-control font-monospace"
                                  [ngModel]="
                                    (getRelationship(relKey)?.['target.fields'] || []).join(', ')
                                  "
                                  (ngModelChange)="
                                    updateRelationshipFields(relKey, 'target.fields', $event)
                                  "
                                  placeholder="Id"
                                />
                              </div>
                            </div>
                            @if (getRelationship(relKey)?.['linking.object'] !== undefined) {
                              <div class="alert alert-info mt-2">
                                <strong>Many-to-Many Relationship</strong>
                                <div class="row mt-2">
                                  <div class="col-md-4 mb-2">
                                    <label class="form-label small">Linking Object</label>
                                    <input
                                      type="text"
                                      class="form-control form-control-sm font-monospace"
                                      [ngModel]="getRelationship(relKey)?.['linking.object']"
                                      (ngModelChange)="
                                        updateRelationshipField(relKey, 'linking.object', $event)
                                      "
                                    />
                                  </div>
                                  <div class="col-md-4 mb-2">
                                    <label class="form-label small">Linking Source Fields</label>
                                    <input
                                      type="text"
                                      class="form-control form-control-sm font-monospace"
                                      [ngModel]="
                                        (
                                          getRelationship(relKey)?.['linking.source.fields'] || []
                                        ).join(', ')
                                      "
                                      (ngModelChange)="
                                        updateRelationshipFields(
                                          relKey,
                                          'linking.source.fields',
                                          $event
                                        )
                                      "
                                    />
                                  </div>
                                  <div class="col-md-4 mb-2">
                                    <label class="form-label small">Linking Target Fields</label>
                                    <input
                                      type="text"
                                      class="form-control form-control-sm font-monospace"
                                      [ngModel]="
                                        (
                                          getRelationship(relKey)?.['linking.target.fields'] || []
                                        ).join(', ')
                                      "
                                      (ngModelChange)="
                                        updateRelationshipFields(
                                          relKey,
                                          'linking.target.fields',
                                          $event
                                        )
                                      "
                                    />
                                  </div>
                                </div>
                              </div>
                            }
                            <div class="mt-2">
                              <button
                                type="button"
                                class="btn btn-sm btn-outline-secondary"
                                (click)="toggleLinkingObject(relKey)"
                              >
                                @if (getRelationship(relKey)?.['linking.object'] !== undefined) {
                                  <i class="bi bi-dash-circle me-1"></i>
                                  Remove Many-to-Many Configuration
                                } @else {
                                  <i class="bi bi-plus-circle me-1"></i>
                                  Configure as Many-to-Many
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      }
                    } @else {
                      <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        No relationships defined. Click "Add Relationship" to define relationships
                        to other entities.
                      </div>
                    }
                  </div>

                  <!-- API Configuration -->
                  <div class="accordion mb-4" id="apiConfigAccordion">
                    <div class="accordion-item">
                      <h2 class="accordion-header">
                        <button
                          [class.collapsed]="!showApiConfig()"
                          class="accordion-button"
                          type="button"
                          (click)="toggleApiConfig()"
                          [attr.aria-expanded]="showApiConfig()"
                        >
                          <i class="bi bi-globe me-2"></i>
                          API Configuration
                        </button>
                      </h2>
                      <div [class.show]="showApiConfig()" class="accordion-collapse collapse">
                        <div class="accordion-body">
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
                                <label for="restEnabled" class="form-check-label">
                                  REST API Enabled
                                </label>
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
                                <label for="mcpEnabled" class="form-check-label">
                                  MCP DML Tools
                                </label>
                              </div>
                            </div>
                          </div>

                          <!-- REST Advanced Configuration -->
                          @if (entity.rest.enabled) {
                            <div class="row mb-3">
                              <div class="col-md-6 mb-3">
                                <label for="restPath" class="form-label">
                                  REST Path
                                  <small class="text-muted">(optional)</small>
                                </label>
                                <input
                                  type="text"
                                  id="restPath"
                                  class="form-control"
                                  [ngModel]="entity.rest.path"
                                  (ngModelChange)="updateRestField('path', $event)"
                                  placeholder="Default: /{{ entity.name }}"
                                />
                              </div>
                              <div class="col-md-6 mb-3">
                                <label class="form-label d-block">Allowed REST Methods</label>
                                <div class="d-flex gap-3 flex-wrap" style="max-width: 100%">
                                  @for (
                                    method of ['get', 'post', 'put', 'patch', 'delete'];
                                    track method
                                  ) {
                                    <div class="form-check">
                                      <input
                                        type="checkbox"
                                        class="form-check-input"
                                        [id]="'method-' + method"
                                        [checked]="isRestMethodEnabled(method)"
                                        (change)="toggleRestMethod(method, $event)"
                                      />
                                      <label
                                        [for]="'method-' + method"
                                        class="form-check-label text-uppercase"
                                      >
                                        {{ method }}
                                      </label>
                                    </div>
                                  }
                                </div>
                                <small class="form-text text-muted d-block mt-1">
                                  Leave empty to allow all methods
                                </small>
                              </div>
                            </div>
                          }

                          <!-- GraphQL Advanced Configuration -->
                          @if (entity.graphql.enabled) {
                            <div class="row mb-4">
                              <div class="col-md-4 mb-3">
                                <label for="graphqlType" class="form-label">
                                  GraphQL Type (Singular)
                                  <small class="text-muted">(optional)</small>
                                </label>
                                <input
                                  type="text"
                                  id="graphqlType"
                                  class="form-control"
                                  [ngModel]="getGraphQLTypeSingular()"
                                  (ngModelChange)="updateGraphQLTypeSingular($event)"
                                  placeholder="Default: {{ entity.name }}"
                                />
                              </div>
                              <div class="col-md-4 mb-3">
                                <label for="graphqlTypePlural" class="form-label">
                                  GraphQL Type (Plural)
                                  <small class="text-muted">(optional)</small>
                                </label>
                                <input
                                  type="text"
                                  id="graphqlTypePlural"
                                  class="form-control"
                                  [ngModel]="getGraphQLTypePlural()"
                                  (ngModelChange)="updateGraphQLTypePlural($event)"
                                  placeholder="Default: {{ entity.name }}s"
                                />
                              </div>
                              @if (entity.source.type === 'stored-procedure') {
                                <div class="col-md-4 mb-3">
                                  <label for="graphqlOperation" class="form-label"
                                    >GraphQL Operation</label
                                  >
                                  <select
                                    id="graphqlOperation"
                                    class="form-select"
                                    [ngModel]="entity.graphql.operation || 'mutation'"
                                    (ngModelChange)="updateGraphqlField('operation', $event)"
                                  >
                                    <option value="mutation">Mutation</option>
                                    <option value="query">Query</option>
                                  </select>
                                </div>
                              }
                            </div>
                          }

                          <!-- View Key Fields Configuration -->
                          @if (entity.source.type === 'view') {
                            <h6 class="border-bottom pb-2 mb-3">
                              <i class="bi bi-key me-2"></i>
                              View Key Fields
                            </h6>
                            <div class="row mb-4">
                              <div class="col-12">
                                <label class="form-label">
                                  Primary Key Fields
                                  <small class="text-muted">(required for views)</small>
                                </label>
                                <input
                                  type="text"
                                  class="form-control"
                                  [ngModel]="(entity.source['key-fields'] || []).join(', ')"
                                  (ngModelChange)="updateKeyFields($event)"
                                  placeholder="e.g., Id, UserId"
                                />
                                <small class="form-text text-muted">
                                  Comma-separated list of column names that uniquely identify rows
                                </small>
                              </div>
                            </div>
                          }

                          <!-- Stored Procedure Parameters -->
                          @if (entity.source.type === 'stored-procedure') {
                            <h6 class="border-bottom pb-2 mb-3">
                              <i class="bi bi-gear me-2"></i>
                              Stored Procedure Parameters
                              <button
                                type="button"
                                class="btn btn-sm btn-outline-primary ms-2"
                                (click)="addParameter()"
                              >
                                <i class="bi bi-plus"></i>
                                Add Parameter
                              </button>
                            </h6>
                            <div class="mb-4">
                              @if (
                                entity.source.parameters && entity.source.parameters.length > 0
                              ) {
                                <div class="table-responsive">
                                  <table class="table table-sm table-bordered">
                                    <thead class="table-light">
                                      <tr>
                                        <th>Parameter Name</th>
                                        <th>Required</th>
                                        <th>Default Value</th>
                                        <th>Description</th>
                                        <th style="width: 60px">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      @for (
                                        param of entity.source.parameters;
                                        track param.name;
                                        let idx = $index
                                      ) {
                                        <tr>
                                          <td>
                                            <input
                                              type="text"
                                              class="form-control form-control-sm font-monospace"
                                              [ngModel]="param.name"
                                              (ngModelChange)="updateParameter(idx, 'name', $event)"
                                              placeholder="@ParamName"
                                            />
                                          </td>
                                          <td class="text-center">
                                            <input
                                              type="checkbox"
                                              class="form-check-input"
                                              [checked]="param.required"
                                              (change)="toggleParameterRequired(idx)"
                                            />
                                          </td>
                                          <td>
                                            <input
                                              type="text"
                                              class="form-control form-control-sm"
                                              [ngModel]="param.default"
                                              (ngModelChange)="
                                                updateParameter(idx, 'default', $event)
                                              "
                                              placeholder="null"
                                            />
                                          </td>
                                          <td>
                                            <input
                                              type="text"
                                              class="form-control form-control-sm"
                                              [ngModel]="param.description"
                                              (ngModelChange)="
                                                updateParameter(idx, 'description', $event)
                                              "
                                            />
                                          </td>
                                          <td class="text-center">
                                            <button
                                              type="button"
                                              class="btn btn-sm btn-outline-danger"
                                              (click)="removeParameter(idx)"
                                              title="Remove parameter"
                                            >
                                              <i class="bi bi-trash"></i>
                                            </button>
                                          </td>
                                        </tr>
                                      }
                                    </tbody>
                                  </table>
                                </div>
                              } @else {
                                <div class="alert alert-info">
                                  <i class="bi bi-info-circle me-2"></i>
                                  No parameters defined. Click "Add Parameter" to add stored
                                  procedure parameters with default values.
                                </div>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Columns / Fields -->
                  <h6 class="border-bottom pb-2 mb-3">
                    <i class="bi bi-list-columns me-2"></i>
                    Fields
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary ms-2"
                      (click)="addColumn()"
                    >
                      <i class="bi bi-plus"></i>
                      Add Field
                    </button>
                    @if (entity.columns.length > 0) {
                      <button
                        type="button"
                        class="btn btn-sm btn-link ms-2"
                        (click)="toggleColumns()"
                      >
                        {{ showColumns() ? 'Hide' : 'Show' }}
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-success ms-2"
                        (click)="autoGenerateRelationships()"
                        [disabled]="!hasForeignKeys()"
                        title="Auto-generate relationships from foreign keys"
                      >
                        <i class="bi bi-diagram-3 me-1"></i>
                        Generate Relationships
                      </button>
                    }
                    <a
                      href="https://learn.microsoft.com/en-us/azure/data-api-builder/mcp/how-to-add-descriptions"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="ms-2 text-decoration-none"
                      title="Learn about field configuration"
                    >
                      <i class="bi bi-question-circle"></i>
                    </a>
                  </h6>
                  <div class="mb-4">
                    @if (entity.columns.length > 0 && showColumns()) {
                      <div class="table-responsive">
                        <table class="table table-sm table-bordered">
                          <thead class="table-light">
                            <tr>
                              <th>Field Name</th>
                              <th>Data Type</th>
                              <th style="width: 80px">Nullable</th>
                              <th style="width: 100px">Primary Key</th>
                              <th style="width: 100px">Foreign Key</th>
                              <th>FK Entity</th>
                              <th>FK Field</th>
                              <th>Description</th>
                              <th style="width: 60px">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (col of entity.columns; track col.name; let idx = $index) {
                              <tr>
                                <td>
                                  <input
                                    type="text"
                                    class="form-control form-control-sm font-monospace"
                                    [ngModel]="col.name"
                                    (ngModelChange)="updateColumn(idx, 'name', $event)"
                                    placeholder="FieldName"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    class="form-control form-control-sm"
                                    [ngModel]="col.type"
                                    (ngModelChange)="updateColumn(idx, 'type', $event)"
                                    placeholder="string, int, etc."
                                  />
                                </td>
                                <td class="text-center">
                                  <input
                                    type="checkbox"
                                    class="form-check-input"
                                    [checked]="col.nullable"
                                    (change)="toggleColumnNullable(idx)"
                                  />
                                </td>
                                <td class="text-center">
                                  <input
                                    type="checkbox"
                                    class="form-check-input"
                                    [checked]="col.isPrimaryKey"
                                    (change)="toggleColumnPrimaryKey(idx)"
                                  />
                                </td>
                                <td class="text-center">
                                  <input
                                    type="checkbox"
                                    class="form-check-input"
                                    [checked]="!!col.foreignKey"
                                    (change)="toggleColumnForeignKey(idx, $event)"
                                  />
                                </td>
                                <td>
                                  @if (col.foreignKey) {
                                    <input
                                      type="text"
                                      class="form-control form-control-sm"
                                      [ngModel]="col.foreignKey.entity"
                                      (ngModelChange)="updateForeignKey(idx, 'entity', $event)"
                                      placeholder="User"
                                      list="entityList"
                                    />
                                    <datalist id="entityList">
                                      @for (e of configBuilder.entities(); track e.id) {
                                        <option [value]="e.name"></option>
                                      }
                                    </datalist>
                                  }
                                </td>
                                <td>
                                  @if (col.foreignKey) {
                                    <input
                                      type="text"
                                      class="form-control form-control-sm"
                                      [ngModel]="col.foreignKey.field"
                                      (ngModelChange)="updateForeignKey(idx, 'field', $event)"
                                      placeholder="Id"
                                    />
                                  }
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    class="form-control form-control-sm"
                                    [ngModel]="col.description || ''"
                                    (ngModelChange)="updateColumn(idx, 'description', $event)"
                                    placeholder="Field description"
                                  />
                                </td>
                                <td class="text-center">
                                  <button
                                    type="button"
                                    class="btn btn-sm btn-outline-danger"
                                    (click)="removeColumn(idx)"
                                    title="Remove field"
                                  >
                                    <i class="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    } @else if (entity.columns.length === 0) {
                      <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        No fields defined. Click "Add Field" to manually add field configurations.
                        Fields are used to provide descriptions and metadata in the MCP tools and
                        API documentation.
                      </div>
                    }
                  </div>
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

      <!-- Import Modal -->
      @if (showImportModal()) {
        <div class="modal d-block" tabindex="-1" role="dialog" (click)="showImportModal.set(false)">
          <div class="modal-dialog modal-lg" role="document" (click)="$event.stopPropagation()">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-file-earmark-arrow-up me-2"></i>
                  Import Additional Entities
                </h5>
                <button
                  type="button"
                  class="btn-close"
                  (click)="showImportModal.set(false)"
                  aria-label="Close"
                ></button>
              </div>
              <div class="modal-body">
                <p class="text-muted mb-4">
                  Import your database schema to automatically generate entity configurations. All
                  discovered tables will be added to your existing entities.
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
                    <label for="jsonFileModal" class="form-label">Select JSON Schema File</label>
                    <input
                      type="file"
                      id="jsonFileModal"
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
                    <label for="sqlInputModal" class="form-label">
                      Paste CREATE TABLE Statements
                    </label>
                    <textarea
                      id="sqlInputModal"
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
                    <button type="button" class="btn btn-primary" (click)="addEntityFromModal()">
                      <i class="bi bi-plus-lg me-1"></i>
                      Add Entity Manually
                    </button>
                  </div>
                }
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeImportModal()">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop show"></div>
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
  readonly showApiConfig = signal(false);
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
      this.showImportModal.set(false);
      // Reset the file input
      input.value = '';
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Failed to import schema');
      // Reset the file input even on error
      input.value = '';
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
      this.showImportModal.set(false);
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Failed to parse SQL');
    }
  }

  addEntity(): void {
    const entity = this.schemaImporter.createEmptyEntity();
    this.configBuilder.addEntity(entity);
    this.selectedEntityId.set(entity.id);
  }

  addEntityFromModal(): void {
    this.addEntity();
    this.closeImportModal();
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    this.importMode.set(null);
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

  toggleApiConfig(): void {
    this.showApiConfig.update((v) => !v);
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

  updateColumnDescription(columnName: string, description: string): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const updatedColumns = entity.columns.map((col) =>
      col.name === columnName ? { ...col, description: description.trim() || undefined } : col,
    );
    this.configBuilder.updateEntity(entity.id, { columns: updatedColumns });
  }

  /** Check if a REST method is enabled */
  isRestMethodEnabled(method: string): boolean {
    const entity = this.selectedEntity();
    if (!entity || !entity.rest.methods) return false;
    return entity.rest.methods.includes(method as 'get' | 'post' | 'put' | 'patch' | 'delete');
  }

  /** Toggle a REST method on/off */
  toggleRestMethod(method: string, event: Event): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const checked = (event.target as HTMLInputElement).checked;
    const methods = entity.rest.methods || [];
    const typedMethod = method as 'get' | 'post' | 'put' | 'patch' | 'delete';

    let updatedMethods: Array<'get' | 'post' | 'put' | 'patch' | 'delete'>;
    if (checked) {
      updatedMethods = [...methods, typedMethod];
    } else {
      updatedMethods = methods.filter((m) => m !== typedMethod);
    }

    const updatedRest = {
      ...entity.rest,
      methods: updatedMethods.length > 0 ? updatedMethods : undefined,
    };
    this.configBuilder.updateEntity(entity.id, { rest: updatedRest });
  }

  /** Get GraphQL type singular name */
  getGraphQLTypeSingular(): string {
    const entity = this.selectedEntity();
    if (!entity) return '';

    if (typeof entity.graphql.type === 'string') {
      return entity.graphql.type;
    } else if (typeof entity.graphql.type === 'object' && entity.graphql.type?.singular) {
      return entity.graphql.type.singular;
    }
    return '';
  }

  /** Get GraphQL type plural name */
  getGraphQLTypePlural(): string {
    const entity = this.selectedEntity();
    if (!entity) return '';

    if (typeof entity.graphql.type === 'object' && entity.graphql.type?.plural) {
      return entity.graphql.type.plural;
    }
    return '';
  }

  /** Update GraphQL type singular name */
  updateGraphQLTypeSingular(value: string): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const currentType = entity.graphql.type;
    let updatedType: string | { singular: string; plural?: string } | undefined;

    if (!value.trim()) {
      // Clear singular, keep plural if it exists
      if (typeof currentType === 'object' && currentType?.plural) {
        updatedType = { singular: entity.name, plural: currentType.plural };
      } else {
        updatedType = undefined;
      }
    } else {
      // Set singular, preserve plural
      if (typeof currentType === 'object' && currentType?.plural) {
        updatedType = { singular: value, plural: currentType.plural };
      } else {
        updatedType = { singular: value };
      }
    }

    const updatedGraphql = { ...entity.graphql, type: updatedType };
    this.configBuilder.updateEntity(entity.id, { graphql: updatedGraphql });
  }

  /** Update GraphQL type plural name */
  updateGraphQLTypePlural(value: string): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const currentType = entity.graphql.type;
    let singular: string;

    if (typeof currentType === 'string') {
      singular = currentType;
    } else if (typeof currentType === 'object' && currentType?.singular) {
      singular = currentType.singular;
    } else {
      singular = entity.name;
    }

    const updatedType: { singular: string; plural?: string } = { singular };
    if (value.trim()) {
      updatedType.plural = value;
    }

    const updatedGraphql = { ...entity.graphql, type: updatedType };
    this.configBuilder.updateEntity(entity.id, { graphql: updatedGraphql });
  }

  /** Update key fields for views */
  updateKeyFields(value: string): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const keyFields = value
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const updatedSource = {
      ...entity.source,
      'key-fields': keyFields.length > 0 ? keyFields : undefined,
    };
    this.configBuilder.updateEntity(entity.id, { source: updatedSource });
  }

  /** Add a parameter to stored procedure */
  addParameter(): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const parameters = entity.source.parameters || [];
    const updatedParameters = [
      ...parameters,
      {
        name: '@NewParameter',
        required: false,
        default: null,
        description: '',
      },
    ];

    const updatedSource = { ...entity.source, parameters: updatedParameters };
    this.configBuilder.updateEntity(entity.id, { source: updatedSource });
  }

  /** Update a parameter field */
  updateParameter(index: number, field: string, value: unknown): void {
    const entity = this.selectedEntity();
    if (!entity || !entity.source.parameters) return;

    const updatedParameters = [...entity.source.parameters];
    updatedParameters[index] = { ...updatedParameters[index], [field]: value };

    const updatedSource = { ...entity.source, parameters: updatedParameters };
    this.configBuilder.updateEntity(entity.id, { source: updatedSource });
  }

  /** Toggle parameter required flag */
  toggleParameterRequired(index: number): void {
    const entity = this.selectedEntity();
    if (!entity || !entity.source.parameters) return;

    const currentValue = entity.source.parameters[index].required || false;
    this.updateParameter(index, 'required', !currentValue);
  }

  /** Remove a parameter from stored procedure */
  removeParameter(index: number): void {
    const entity = this.selectedEntity();
    if (!entity || !entity.source.parameters) return;

    const updatedParameters = entity.source.parameters.filter((_, i) => i !== index);
    const updatedSource = {
      ...entity.source,
      parameters: updatedParameters.length > 0 ? updatedParameters : undefined,
    };
    this.configBuilder.updateEntity(entity.id, { source: updatedSource });
  }

  /** Get relationship keys as array */
  getRelationshipKeys(): string[] {
    const entity = this.selectedEntity();
    if (!entity) return [];
    return Object.keys(entity.relationships || {});
  }

  /** Get a relationship by key */
  getRelationship(key: string): IRelationship | undefined {
    const entity = this.selectedEntity();
    if (!entity) return undefined;
    return entity.relationships?.[key];
  }

  /** Add a new relationship */
  addRelationship(): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    let baseName = 'newRelationship';
    let counter = 1;
    let relationshipName = baseName;

    // Find a unique name
    while (entity.relationships[relationshipName]) {
      relationshipName = `${baseName}${counter}`;
      counter++;
    }

    const newRelationship: IRelationship = {
      cardinality: 'many',
      'target.entity': '',
      'source.fields': [],
      'target.fields': [],
    };

    const updatedRelationships = { ...entity.relationships, [relationshipName]: newRelationship };
    this.configBuilder.updateEntity(entity.id, { relationships: updatedRelationships });
  }

  /** Remove a relationship */
  removeRelationship(key: string): void {
    if (!confirm(`Remove relationship "${key}"?`)) return;

    const entity = this.selectedEntity();
    if (!entity) return;

    const updatedRelationships = { ...entity.relationships };
    delete updatedRelationships[key];
    this.configBuilder.updateEntity(entity.id, { relationships: updatedRelationships });
  }

  /** Rename a relationship */
  renameRelationship(oldKey: string, newKey: string): void {
    const entity = this.selectedEntity();
    if (!entity || !newKey.trim() || oldKey === newKey) return;

    // Check if newKey already exists
    if (entity.relationships[newKey]) {
      this.notifications.warning(`Relationship "${newKey}" already exists`);
      return;
    }

    const relationship = entity.relationships[oldKey];
    const updatedRelationships = { ...entity.relationships };
    delete updatedRelationships[oldKey];
    updatedRelationships[newKey] = relationship;

    this.configBuilder.updateEntity(entity.id, { relationships: updatedRelationships });
  }

  /** Update a relationship field */
  updateRelationshipField(key: string, field: string, value: unknown): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const relationship = entity.relationships[key];
    if (!relationship) return;

    const updatedRelationship = { ...relationship, [field]: value };
    const updatedRelationships = { ...entity.relationships, [key]: updatedRelationship };
    this.configBuilder.updateEntity(entity.id, { relationships: updatedRelationships });
  }

  /** Update a relationship fields array (comma-separated string input) */
  updateRelationshipFields(key: string, field: string, value: string): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const relationship = entity.relationships[key];
    if (!relationship) return;

    const fields = value
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const updatedRelationship = {
      ...relationship,
      [field]: fields.length > 0 ? fields : undefined,
    };
    const updatedRelationships = { ...entity.relationships, [key]: updatedRelationship };
    this.configBuilder.updateEntity(entity.id, { relationships: updatedRelationships });
  }

  /** Toggle linking object for many-to-many relationships */
  toggleLinkingObject(key: string): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const relationship = entity.relationships[key];
    if (!relationship) return;

    const updatedRelationship = { ...relationship };

    if (relationship['linking.object'] !== undefined) {
      // Remove linking configuration
      delete updatedRelationship['linking.object'];
      delete updatedRelationship['linking.source.fields'];
      delete updatedRelationship['linking.target.fields'];
    } else {
      // Add linking configuration
      updatedRelationship['linking.object'] = '';
      updatedRelationship['linking.source.fields'] = [];
      updatedRelationship['linking.target.fields'] = [];
    }

    const updatedRelationships = { ...entity.relationships, [key]: updatedRelationship };
    this.configBuilder.updateEntity(entity.id, { relationships: updatedRelationships });
  }

  /** Add a new column/field to the entity */
  addColumn(): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const newColumn: IColumnInfo = {
      name: 'NewField',
      type: 'string',
      nullable: true,
      isPrimaryKey: false,
      description: '',
    };

    const updatedColumns = [...entity.columns, newColumn];
    this.configBuilder.updateEntity(entity.id, { columns: updatedColumns });

    // Auto-show columns when adding a new one
    this.showColumns.set(true);
  }

  /** Update a column field */
  updateColumn(index: number, field: string, value: unknown): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const updatedColumns = [...entity.columns];
    updatedColumns[index] = { ...updatedColumns[index], [field]: value };

    this.configBuilder.updateEntity(entity.id, { columns: updatedColumns });
  }

  /** Toggle column nullable flag */
  toggleColumnNullable(index: number): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const currentValue = entity.columns[index].nullable;
    this.updateColumn(index, 'nullable', !currentValue);
  }

  /** Toggle column primary key flag */
  toggleColumnPrimaryKey(index: number): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const currentValue = entity.columns[index].isPrimaryKey;
    this.updateColumn(index, 'isPrimaryKey', !currentValue);
  }

  /** Remove a column from the entity */
  removeColumn(index: number): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const updatedColumns = entity.columns.filter((_, i) => i !== index);
    this.configBuilder.updateEntity(entity.id, { columns: updatedColumns });
  }

  /** Toggle column foreign key flag */
  toggleColumnForeignKey(index: number, event: Event): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    const checked = (event.target as HTMLInputElement).checked;
    const updatedColumns = [...entity.columns];

    if (checked) {
      updatedColumns[index] = {
        ...updatedColumns[index],
        foreignKey: { entity: '', field: '' },
      };
    } else {
      const { foreignKey, ...rest } = updatedColumns[index];
      updatedColumns[index] = rest as IColumnInfo;
    }

    this.configBuilder.updateEntity(entity.id, { columns: updatedColumns });
  }

  /** Update foreign key reference */
  updateForeignKey(index: number, field: 'entity' | 'field', value: string): void {
    const entity = this.selectedEntity();
    if (!entity || !entity.columns[index].foreignKey) return;

    const updatedColumns = [...entity.columns];
    updatedColumns[index] = {
      ...updatedColumns[index],
      foreignKey: {
        ...updatedColumns[index].foreignKey!,
        [field]: value,
      },
    };

    this.configBuilder.updateEntity(entity.id, { columns: updatedColumns });
  }

  /** Check if entity has any foreign keys defined */
  hasForeignKeys(): boolean {
    const entity = this.selectedEntity();
    if (!entity) return false;
    return entity.columns.some(
      (col) => col.foreignKey && col.foreignKey.entity && col.foreignKey.field,
    );
  }

  /** Auto-generate relationships from foreign key definitions */
  autoGenerateRelationships(): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    let relationshipsAdded = 0;
    const updatedRelationships = { ...entity.relationships };

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
      while (updatedRelationships[uniqueName]) {
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

      updatedRelationships[uniqueName] = relationship;
      relationshipsAdded++;
    }

    if (relationshipsAdded > 0) {
      this.configBuilder.updateEntity(entity.id, { relationships: updatedRelationships });
      this.notifications.success(
        `Generated ${relationshipsAdded} relationship(s) from foreign keys`,
      );
    } else {
      this.notifications.info('No valid foreign keys found to generate relationships');
    }
  }
}
