import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthProvider, IMcpDmlTools } from '../../../../models';
import { ConfigBuilderService } from '../../../../services/config-builder.service';

@Component({
  selector: 'app-runtime-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="runtime-tab">
      <div class="row">
        <!-- REST Configuration -->
        <div class="col-md-6 mb-4">
          <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <i class="bi bi-braces me-2"></i>
                REST API
              </h5>
              <div class="form-check form-switch mb-0">
                <input
                  type="checkbox"
                  id="restEnabled"
                  class="form-check-input"
                  [ngModel]="configBuilder.restConfig().enabled"
                  (ngModelChange)="configBuilder.setRestConfig({ enabled: $event })"
                />
                <label for="restEnabled" class="form-check-label visually-hidden">
                  Enable REST
                </label>
              </div>
            </div>
            <div class="card-body" [class.text-muted]="!configBuilder.restConfig().enabled">
              <div class="mb-3">
                <label for="restPath" class="form-label">API Path</label>
                <input
                  type="text"
                  id="restPath"
                  class="form-control"
                  [ngModel]="configBuilder.restConfig().path"
                  (ngModelChange)="configBuilder.setRestConfig({ path: $event })"
                  [disabled]="!configBuilder.restConfig().enabled"
                  placeholder="/api"
                />
              </div>
              <div class="form-check">
                <input
                  type="checkbox"
                  id="requestBodyStrict"
                  class="form-check-input"
                  [ngModel]="configBuilder.restConfig()['request-body-strict']"
                  (ngModelChange)="configBuilder.setRestConfig({ 'request-body-strict': $event })"
                  [disabled]="!configBuilder.restConfig().enabled"
                />
                <label for="requestBodyStrict" class="form-check-label">
                  Strict Request Body
                </label>
                <small class="form-text text-muted d-block">
                  Reject requests with extraneous fields
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- GraphQL Configuration -->
        <div class="col-md-6 mb-4">
          <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <i class="bi bi-diagram-3 me-2"></i>
                GraphQL
              </h5>
              <div class="form-check form-switch mb-0">
                <input
                  type="checkbox"
                  id="graphqlEnabled"
                  class="form-check-input"
                  [ngModel]="configBuilder.graphqlConfig().enabled"
                  (ngModelChange)="configBuilder.setGraphQLConfig({ enabled: $event })"
                />
                <label for="graphqlEnabled" class="form-check-label visually-hidden">
                  Enable GraphQL
                </label>
              </div>
            </div>
            <div class="card-body" [class.text-muted]="!configBuilder.graphqlConfig().enabled">
              <div class="mb-3">
                <label for="graphqlPath" class="form-label">GraphQL Path</label>
                <input
                  type="text"
                  id="graphqlPath"
                  class="form-control"
                  [ngModel]="configBuilder.graphqlConfig().path"
                  (ngModelChange)="configBuilder.setGraphQLConfig({ path: $event })"
                  [disabled]="!configBuilder.graphqlConfig().enabled"
                  placeholder="/graphql"
                />
              </div>
              <div class="form-check mb-3">
                <input
                  type="checkbox"
                  id="allowIntrospection"
                  class="form-check-input"
                  [ngModel]="configBuilder.graphqlConfig()['allow-introspection']"
                  (ngModelChange)="
                    configBuilder.setGraphQLConfig({ 'allow-introspection': $event })
                  "
                  [disabled]="!configBuilder.graphqlConfig().enabled"
                />
                <label for="allowIntrospection" class="form-check-label">
                  Allow Introspection
                </label>
              </div>
              <div class="mb-3">
                <label for="depthLimit" class="form-label">Query Depth Limit</label>
                <input
                  type="number"
                  id="depthLimit"
                  class="form-control"
                  [ngModel]="configBuilder.graphqlConfig()['depth-limit']"
                  (ngModelChange)="configBuilder.setGraphQLConfig({ 'depth-limit': $event })"
                  [disabled]="!configBuilder.graphqlConfig().enabled"
                  placeholder="(no limit)"
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- MCP Configuration -->
        <div class="col-md-6 mb-4">
          <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <i class="bi bi-cpu me-2"></i>
                MCP (Model Context Protocol)
              </h5>
              <div class="form-check form-switch mb-0">
                <input
                  type="checkbox"
                  id="mcpEnabled"
                  class="form-check-input"
                  [ngModel]="configBuilder.mcpConfig().enabled"
                  (ngModelChange)="configBuilder.setMcpConfig({ enabled: $event })"
                />
                <label for="mcpEnabled" class="form-check-label visually-hidden">
                  Enable MCP
                </label>
              </div>
            </div>
            <div class="card-body" [class.text-muted]="!configBuilder.mcpConfig().enabled">
              <div class="mb-3">
                <label for="mcpPath" class="form-label">MCP Path</label>
                <input
                  type="text"
                  id="mcpPath"
                  class="form-control"
                  [ngModel]="configBuilder.mcpConfig().path"
                  (ngModelChange)="configBuilder.setMcpConfig({ path: $event })"
                  [disabled]="!configBuilder.mcpConfig().enabled"
                  placeholder="/mcp"
                />
              </div>
              <label class="form-label">DML Tools</label>
              <div class="row">
                @for (tool of dmlTools; track tool.key) {
                  <div class="col-6 mb-2">
                    <div class="form-check">
                      <input
                        type="checkbox"
                        [id]="'dml-' + tool.key"
                        class="form-check-input"
                        [ngModel]="getDmlToolValue(tool.key)"
                        (ngModelChange)="setDmlToolValue(tool.key, $event)"
                        [disabled]="!configBuilder.mcpConfig().enabled"
                      />
                      <label [for]="'dml-' + tool.key" class="form-check-label">
                        {{ tool.label }}
                      </label>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Host Configuration -->
        <div class="col-md-6 mb-4">
          <div class="card h-100">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-hdd-network me-2"></i>
                Host Settings
              </h5>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <label for="hostMode" class="form-label">Mode</label>
                <select
                  id="hostMode"
                  class="form-select"
                  [ngModel]="configBuilder.hostConfig().mode"
                  (ngModelChange)="configBuilder.setHostConfig({ mode: $event })"
                >
                  <option value="development">Development</option>
                  <option value="production">Production</option>
                </select>
                <small class="form-text text-muted">
                  Development mode enables Swagger UI and verbose logging
                </small>
              </div>

              <div class="mb-3">
                <label class="form-label">CORS Origins</label>
                <div class="input-group mb-2">
                  <input
                    type="text"
                    class="form-control"
                    placeholder="https://example.com"
                    #originInput
                  />
                  <button
                    type="button"
                    class="btn btn-outline-primary"
                    (click)="addCorsOrigin(originInput.value); originInput.value = ''"
                  >
                    Add
                  </button>
                </div>
                <div class="d-flex flex-wrap gap-1">
                  @for (origin of configBuilder.hostConfig().cors?.origins || []; track origin) {
                    <span class="badge bg-secondary d-flex align-items-center">
                      {{ origin }}
                      <button
                        type="button"
                        class="btn-close btn-close-white ms-1"
                        style="font-size: 0.5rem"
                        (click)="removeCorsOrigin(origin)"
                        aria-label="Remove"
                      ></button>
                    </span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination Configuration -->
        <div class="col-12 mb-4">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <i class="bi bi-layers me-2"></i>
                Pagination
              </h5>
              <a
                href="https://learn.microsoft.com/en-us/azure/data-api-builder/configuration/runtime#pagination-runtime"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-sm btn-outline-primary"
              >
                <i class="bi bi-book me-1"></i>
                Documentation
              </a>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-4 mb-3">
                  <label for="maxPageSize" class="form-label">Max Page Size</label>
                  <input
                    type="number"
                    id="maxPageSize"
                    class="form-control"
                    [ngModel]="configBuilder.paginationConfig()['max-page-size']"
                    (ngModelChange)="configBuilder.setPaginationConfig({ 'max-page-size': $event })"
                    placeholder="100000 (default)"
                    min="1"
                  />
                  <small class="form-text text-muted">
                    Maximum number of records per page (default: 100,000)
                  </small>
                </div>
                <div class="col-md-4 mb-3">
                  <label for="defaultPageSize" class="form-label">Default Page Size</label>
                  <input
                    type="number"
                    id="defaultPageSize"
                    class="form-control"
                    [ngModel]="configBuilder.paginationConfig()['default-page-size']"
                    (ngModelChange)="
                      configBuilder.setPaginationConfig({ 'default-page-size': $event })
                    "
                    placeholder="100 (default)"
                    min="1"
                  />
                  <small class="form-text text-muted">
                    Default number of records returned (default: 100)
                  </small>
                </div>
                <div class="col-md-4 mb-3">
                  <label class="form-label d-block">Next Link Options</label>
                  <div class="form-check mt-2">
                    <input
                      type="checkbox"
                      id="nextLinkRelative"
                      class="form-check-input"
                      [ngModel]="configBuilder.paginationConfig()['next-link-relative']"
                      (ngModelChange)="
                        configBuilder.setPaginationConfig({ 'next-link-relative': $event })
                      "
                    />
                    <label for="nextLinkRelative" class="form-check-label">
                      Use Relative URLs
                    </label>
                  </div>
                  <small class="form-text text-muted d-block mt-1">
                    Use relative URLs for pagination links
                  </small>
                </div>
              </div>
              <div class="alert alert-info mb-0 mt-2">
                <small>
                  <strong>Pagination Settings:</strong> Configure default pagination behavior for
                  REST and GraphQL endpoints. Leave values empty to use defaults (max: 100,000,
                  default: 100).
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- Authentication Configuration -->
        <div class="col-12 mb-4">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <i class="bi bi-shield-check me-2"></i>
                Authentication
              </h5>
              <a
                href="https://learn.microsoft.com/en-us/azure/data-api-builder/mcp/how-to-configure-authentication?tabs=bash"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-sm btn-outline-primary"
              >
                <i class="bi bi-book me-1"></i>
                Setup Guide
              </a>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-4 mb-3">
                  <label for="authProvider" class="form-label">Provider</label>
                  <select
                    id="authProvider"
                    class="form-select"
                    [ngModel]="configBuilder.hostConfig().authentication?.provider || 'None'"
                    (ngModelChange)="setAuthProvider($event)"
                  >
                    @for (provider of authProviders; track provider.value) {
                      <option [value]="provider.value">{{ provider.label }}</option>
                    }
                  </select>
                </div>

                @if (requiresJwt()) {
                  <div class="col-md-4 mb-3">
                    <label for="jwtAudience" class="form-label">JWT Audience</label>
                    <input
                      type="text"
                      id="jwtAudience"
                      class="form-control"
                      [ngModel]="configBuilder.hostConfig().authentication?.jwt?.audience || ''"
                      (ngModelChange)="setJwtField('audience', $event)"
                      placeholder="Application ID or URL"
                    />
                  </div>
                  <div class="col-md-4 mb-3">
                    <label for="jwtIssuer" class="form-label">JWT Issuer</label>
                    <input
                      type="text"
                      id="jwtIssuer"
                      class="form-control"
                      [ngModel]="configBuilder.hostConfig().authentication?.jwt?.issuer || ''"
                      (ngModelChange)="setJwtField('issuer', $event)"
                      placeholder="https://login.microsoftonline.com/{tenant}/v2.0"
                    />
                  </div>
                }
              </div>

              <div class="alert alert-info mb-0 mt-2">
                <small>
                  @switch (configBuilder.hostConfig().authentication?.provider) {
                    @case ('None') {
                      <strong>No Authentication:</strong> All requests will be allowed without
                      authentication. Use only for development or when authentication is handled
                      externally.
                    }
                    @case ('EntraID') {
                      <strong>Microsoft Entra ID:</strong> Configure JWT audience and issuer from
                      your app registration.
                    }
                    @case ('StaticWebApps') {
                      <strong>Static Web Apps:</strong> Authentication is handled by Azure Static
                      Web Apps. No additional config needed.
                    }
                    @case ('AppService') {
                      <strong>App Service:</strong> Configure authentication in Azure Portal under
                      App Service Authentication.
                    }
                    @case ('Simulator') {
                      <strong>Simulator:</strong> For development/testing only. Simulates
                      authenticated requests.
                    }
                    @default {
                      <strong>No Authentication:</strong> All requests will be allowed without
                      authentication. Use only for development or when authentication is handled
                      externally.
                    }
                  }
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .card-body.text-muted {
      opacity: 0.6;
    }
  `,
})
export class RuntimeTabComponent {
  protected readonly configBuilder = inject(ConfigBuilderService);

  readonly authProviders: { value: AuthProvider; label: string }[] = [
    { value: 'None', label: 'None (No Authentication)' },
    { value: 'AppService', label: 'Azure App Service' },
    { value: 'EntraID', label: 'Microsoft Entra ID' },
    { value: 'StaticWebApps', label: 'Azure Static Web Apps' },
    { value: 'Simulator', label: 'Simulator (Development)' },
    { value: 'Custom', label: 'Custom JWT Provider' },
  ];

  readonly dmlTools: { key: keyof IMcpDmlTools; label: string }[] = [
    { key: 'describe-entities', label: 'Describe Entities' },
    { key: 'create-record', label: 'Create Record' },
    { key: 'read-records', label: 'Read Records' },
    { key: 'update-record', label: 'Update Record' },
    { key: 'delete-record', label: 'Delete Record' },
    { key: 'execute-entity', label: 'Execute Entity' },
  ];

  getDmlToolValue(key: keyof IMcpDmlTools): boolean {
    const dmlTools = this.configBuilder.mcpConfig()['dml-tools'];
    if (typeof dmlTools === 'boolean') return dmlTools;
    return dmlTools[key] ?? false;
  }

  setDmlToolValue(key: keyof IMcpDmlTools, value: boolean): void {
    const current = this.configBuilder.mcpConfig()['dml-tools'];
    const dmlTools: IMcpDmlTools =
      typeof current === 'boolean'
        ? {
            'describe-entities': current,
            'create-record': current,
            'read-records': current,
            'update-record': current,
            'delete-record': current,
            'execute-entity': current,
          }
        : { ...current };

    dmlTools[key] = value;
    this.configBuilder.setMcpConfig({ 'dml-tools': dmlTools });
  }

  requiresJwt(): boolean {
    const provider = this.configBuilder.hostConfig().authentication?.provider;
    return provider === 'EntraID' || provider === 'AzureAD' || provider === 'Custom';
  }

  setAuthProvider(provider: AuthProvider): void {
    const current = this.configBuilder.hostConfig();
    if (provider === 'None') {
      // Remove authentication section entirely
      this.configBuilder.setHostConfig({
        authentication: undefined,
      });
    } else {
      this.configBuilder.setHostConfig({
        authentication: {
          ...current.authentication,
          provider,
          jwt: this.requiresJwt() ? current.authentication?.jwt : undefined,
        },
      });
    }
  }

  setJwtField(field: 'audience' | 'issuer', value: string): void {
    const current = this.configBuilder.hostConfig();
    this.configBuilder.setHostConfig({
      authentication: {
        ...current.authentication,
        provider: current.authentication?.provider || 'EntraID',
        jwt: {
          audience: current.authentication?.jwt?.audience || '',
          issuer: current.authentication?.jwt?.issuer || '',
          [field]: value,
        },
      },
    });
  }

  addCorsOrigin(origin: string): void {
    const trimmed = origin.trim();
    if (!trimmed) return;

    const current = this.configBuilder.hostConfig().cors?.origins || [];
    if (current.includes(trimmed)) return;

    this.configBuilder.setHostConfig({
      cors: {
        origins: [...current, trimmed],
        'allow-credentials': this.configBuilder.hostConfig().cors?.['allow-credentials'] ?? false,
      },
    });
  }

  removeCorsOrigin(origin: string): void {
    const current = this.configBuilder.hostConfig().cors?.origins || [];
    this.configBuilder.setHostConfig({
      cors: {
        origins: current.filter((o) => o !== origin),
        'allow-credentials': this.configBuilder.hostConfig().cors?.['allow-credentials'] ?? false,
      },
    });
  }
}
