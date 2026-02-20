import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WizardTab } from '../../models';
import { ConfigBuilderService } from '../../services/config-builder.service';
import { JsonPreviewPanelComponent } from './components/json-preview-panel/json-preview-panel.component';
import { ConnectionTabComponent } from './tabs/connection-tab/connection-tab.component';
import { EntitiesTabComponent } from './tabs/entities-tab/entities-tab.component';
import { PermissionsTabComponent } from './tabs/permissions-tab/permissions-tab.component';
import { RuntimeTabComponent } from './tabs/runtime-tab/runtime-tab.component';

@Component({
  selector: 'app-config-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ConnectionTabComponent,
    EntitiesTabComponent,
    PermissionsTabComponent,
    RuntimeTabComponent,
    JsonPreviewPanelComponent,
  ],
  template: `
    <div class="config-wizard" [class.preview-open]="configBuilder.previewOpen()">
      <!-- Header -->
      <div class="wizard-header">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h1 class="h3 mb-1">DAB Config Builder</h1>
            <p class="text-muted mb-0">
              Create your Data API Builder configuration
              <a
                href="https://learn.microsoft.com/en-us/azure/data-api-builder/"
                target="_blank"
                rel="noopener noreferrer"
                class="ms-2"
              >
                <i class="bi bi-book me-1"></i>Documentation
              </a>
            </p>
            <div class="mt-3">
              <p class="mb-2"><strong>How to use this wizard:</strong></p>
              <ul class="text-muted small mb-2">
                <li>
                  <strong>Connection:</strong> Configure your database connection string and type
                </li>
                <li>
                  <strong>Entities:</strong> Define the tables/views to expose as API endpoints
                </li>
                <li><strong>Permissions:</strong> Set up access control rules for your entities</li>
                <li>
                  <strong>Runtime:</strong> Configure runtime settings like caching and telemetry
                </li>
              </ul>
              <p class="text-muted small mb-0">
                <i class="bi bi-info-circle me-1"></i>
                When finished, click <strong>"Show JSON"</strong> to view your configuration, then
                download and use the generated file with your MCP server.
              </p>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary"
              (click)="configBuilder.togglePreview()"
              [class.active]="configBuilder.previewOpen()"
            >
              <i class="bi bi-code-square me-1"></i>
              {{ configBuilder.previewOpen() ? 'Hide' : 'Show' }} JSON
            </button>
            <button type="button" class="btn btn-outline-danger" (click)="resetConfig()">
              <i class="bi bi-arrow-counterclockwise me-1"></i>
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <ul class="nav nav-tabs mt-4" role="tablist">
        @for (tab of tabs; track tab.id) {
          <li class="nav-item" role="presentation">
            <button
              type="button"
              class="nav-link"
              [class.active]="activeTab() === tab.id"
              [attr.aria-selected]="activeTab() === tab.id"
              role="tab"
              (click)="setActiveTab(tab.id)"
            >
              <i class="bi bi-{{ tab.icon }} me-1"></i>
              {{ tab.label }}
              @if (tab.id === 'entities' && configBuilder.entities().length > 0) {
                <span class="badge bg-primary ms-1">
                  {{ enabledEntitiesCount() }}
                </span>
              }
            </button>
          </li>
        }
      </ul>

      <!-- Tab Content -->
      <div class="tab-content py-4">
        @switch (activeTab()) {
          @case ('connection') {
            <app-connection-tab />
          }
          @case ('entities') {
            <app-entities-tab />
          }
          @case ('permissions') {
            <app-permissions-tab />
          }
          @case ('runtime') {
            <app-runtime-tab />
          }
        }
      </div>

      <!-- JSON Preview Panel -->
      <app-json-preview-panel />
    </div>
  `,
  styles: `
    .config-wizard {
      padding: 1.5rem;
      transition: margin-right 0.3s ease;
    }

    .config-wizard.preview-open {
      margin-right: 450px;
    }

    .wizard-header {
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--bs-border-color);
    }

    .nav-tabs .nav-link {
      color: var(--bs-body-color);
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .nav-tabs .nav-link:hover {
      border-color: var(--bs-border-color);
    }

    .nav-tabs .nav-link.active {
      color: var(--bs-primary);
      border-bottom-color: var(--bs-primary);
      background: transparent;
    }

    .nav-tabs .nav-link .badge {
      font-size: 0.7rem;
    }

    @media (max-width: 768px) {
      .config-wizard.preview-open {
        margin-right: 0;
      }
    }
  `,
})
export class ConfigWizardComponent {
  protected readonly configBuilder = inject(ConfigBuilderService);

  readonly tabs = [
    { id: 'connection' as WizardTab, label: 'Connection', icon: 'plug' },
    { id: 'entities' as WizardTab, label: 'Entities', icon: 'table' },
    { id: 'permissions' as WizardTab, label: 'Permissions', icon: 'shield-lock' },
    { id: 'runtime' as WizardTab, label: 'Runtime', icon: 'gear' },
  ];

  readonly activeTab = signal<WizardTab>('connection');

  readonly enabledEntitiesCount = computed(
    () => this.configBuilder.entities().filter((e) => e.enabled).length,
  );

  setActiveTab(tab: WizardTab): void {
    this.activeTab.set(tab);
  }

  resetConfig(): void {
    if (confirm('Are you sure you want to reset all configuration?')) {
      this.configBuilder.reset();
      this.activeTab.set('connection');
    }
  }
}
