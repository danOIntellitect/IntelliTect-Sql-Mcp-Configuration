import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IGeneratedEntity,
  IPermission,
  IPermissionWarning,
  PermissionAction,
  PermissionWarningType,
} from '../../../../models';
import { ConfigBuilderService } from '../../../../services/config-builder.service';
import { ModalService } from '../../../../services/modal.service';
import { NotificationService } from '../../../../services/notification.service';
import { PermissionWarningModalComponent } from '../../components/permission-warning-modal/permission-warning-modal.component';

@Component({
  selector: 'app-permissions-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="permissions-tab">
      @if (enabledEntities().length === 0) {
        <!-- Empty State -->
        <div class="text-center py-5">
          <i class="bi bi-shield-lock display-1 text-muted mb-3 d-block"></i>
          <h4>No Entities to Configure</h4>
          <p class="text-muted">
            Add entities in the Entities tab first, then configure their permissions here.
          </p>
        </div>
      } @else {
        <!-- Roles Management -->
        <div class="card mb-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="bi bi-people me-2"></i>
              Roles
            </h5>
            <div class="d-flex gap-2">
              <input
                type="text"
                class="form-control form-control-sm"
                style="width: 150px"
                placeholder="New role name"
                [(ngModel)]="newRoleName"
              />
              <button
                type="button"
                class="btn btn-sm btn-primary"
                [disabled]="!newRoleName()"
                (click)="addRole()"
              >
                <i class="bi bi-plus"></i> Add Role
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="d-flex flex-wrap gap-2">
              @for (role of roles(); track role) {
                <span
                  class="badge rounded-pill d-flex align-items-center gap-1"
                  [class.bg-warning]="role === 'anonymous'"
                  [class.text-dark]="role === 'anonymous'"
                  [class.bg-primary]="role === 'authenticated'"
                  [class.bg-secondary]="role !== 'anonymous' && role !== 'authenticated'"
                >
                  @if (role === 'anonymous') {
                    <i class="bi bi-exclamation-triangle-fill"></i>
                  }
                  {{ role }}
                  @if (role !== 'authenticated') {
                    <button
                      type="button"
                      class="btn-close btn-close-white ms-1"
                      style="font-size: 0.6rem"
                      (click)="removeRole(role)"
                      aria-label="Remove role"
                    ></button>
                  }
                </span>
              }
            </div>
          </div>
        </div>

        <!-- Permissions Matrix -->
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-table me-2"></i>
              Permissions Matrix
            </h5>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-bordered mb-0 permissions-table">
                <thead class="table-light">
                  <tr>
                    <th class="entity-column">Entity</th>
                    @for (role of roles(); track role) {
                      <th class="role-column text-center">
                        {{ role }}
                        @if (role === 'anonymous') {
                          <i class="bi bi-exclamation-triangle-fill text-warning ms-1"></i>
                        }
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (entity of enabledEntities(); track entity.id) {
                    <tr>
                      <td>
                        <strong>{{ entity.name }}</strong>
                        <small class="text-muted d-block">{{ entity.source.object }}</small>
                      </td>
                      @for (role of roles(); track role) {
                        <td class="text-center p-2">
                          <div class="permission-cell">
                            @for (action of availableActions; track action) {
                              <button
                                type="button"
                                class="btn btn-sm permission-btn"
                                [class.btn-success]="hasPermission(entity, role, action)"
                                [class.btn-outline-secondary]="!hasPermission(entity, role, action)"
                                [title]="action"
                                (click)="togglePermission(entity, role, action)"
                              >
                                {{ getActionIcon(action) }}
                              </button>
                            }
                          </div>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer">
            <div class="d-flex gap-3 text-muted small">
              <span><strong>C</strong> = Create</span>
              <span><strong>R</strong> = Read</span>
              <span><strong>U</strong> = Update</span>
              <span><strong>D</strong> = Delete</span>
              <span><strong>*</strong> = All</span>
            </div>
          </div>
        </div>

        <!-- Safety Tips -->
        <div class="alert alert-info mt-4">
          <h6 class="alert-heading">
            <i class="bi bi-lightbulb me-2"></i>
            Best Practices
          </h6>
          <ul class="mb-0 small">
            <li>Avoid granting <strong>anonymous</strong> access unless absolutely necessary.</li>
            <li>
              Use specific roles instead of <strong>authenticated</strong> for write operations.
            </li>
            <li>The <strong>read</strong> action is safest for authenticated users.</li>
          </ul>
        </div>
      }
    </div>
  `,
  styles: `
    .permissions-table {
      table-layout: fixed;
    }

    .entity-column {
      width: 200px;
    }

    .role-column {
      min-width: 150px;
    }

    .permission-cell {
      display: flex;
      gap: 2px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .permission-btn {
      width: 28px;
      height: 28px;
      padding: 0;
      font-size: 0.75rem;
      font-weight: bold;
    }

    .badge .btn-close {
      filter: brightness(0) invert(1);
    }

    .badge.bg-warning .btn-close {
      filter: brightness(0);
    }
  `,
})
export class PermissionsTabComponent {
  protected readonly configBuilder = inject(ConfigBuilderService);
  private readonly modalService = inject(ModalService);
  private readonly notifications = inject(NotificationService);

  readonly newRoleName = signal('');
  readonly suppressedWarnings = signal<Set<string>>(new Set());

  readonly availableActions: PermissionAction[] = ['create', 'read', 'update', 'delete', '*'];

  readonly enabledEntities = () => this.configBuilder.entities().filter((e) => e.enabled);

  readonly roles = () => {
    const entities = this.enabledEntities();
    const allRoles = new Set<string>(['authenticated', 'anonymous']);

    for (const entity of entities) {
      for (const perm of entity.permissions) {
        allRoles.add(perm.role);
      }
    }

    return Array.from(allRoles).sort((a, b) => {
      // Sort: authenticated first, then anonymous, then others alphabetically
      if (a === 'authenticated') return -1;
      if (b === 'authenticated') return 1;
      if (a === 'anonymous') return -1;
      if (b === 'anonymous') return 1;
      return a.localeCompare(b);
    });
  };

  getActionIcon(action: PermissionAction): string {
    switch (action) {
      case 'create':
        return 'C';
      case 'read':
        return 'R';
      case 'update':
        return 'U';
      case 'delete':
        return 'D';
      case '*':
        return '*';
      default:
        return '?';
    }
  }

  hasPermission(entity: IGeneratedEntity, role: string, action: PermissionAction): boolean {
    const perm = entity.permissions.find((p) => p.role === role);
    if (!perm) return false;
    if (perm.actions === '*') return true;
    return Array.isArray(perm.actions) && perm.actions.includes(action);
  }

  async addRole(): Promise<void> {
    const roleName = this.newRoleName().trim();
    if (!roleName) return;

    if (this.roles().includes(roleName)) {
      this.notifications.warning('Role already exists');
      return;
    }

    // Add role with no permissions to all entities
    for (const entity of this.enabledEntities()) {
      const newPermissions = [
        ...entity.permissions,
        { role: roleName, actions: [] as PermissionAction[] },
      ];
      this.configBuilder.updateEntity(entity.id, { permissions: newPermissions });
    }

    this.newRoleName.set('');
  }

  removeRole(role: string): void {
    if (role === 'authenticated') {
      this.notifications.warning('Cannot remove the authenticated role');
      return;
    }

    // Remove role from all entities
    for (const entity of this.enabledEntities()) {
      const newPermissions = entity.permissions.filter((p) => p.role !== role);
      this.configBuilder.updateEntity(entity.id, { permissions: newPermissions });
    }
  }

  async togglePermission(
    entity: IGeneratedEntity,
    role: string,
    action: PermissionAction,
  ): Promise<void> {
    const currentlyHas = this.hasPermission(entity, role, action);

    // If enabling a permission, check for warnings
    if (!currentlyHas) {
      const warningType = this.getWarningType(role, action);
      if (warningType) {
        const proceed = await this.showWarning(warningType, role, action, entity.name);
        if (!proceed) return;
      }
    }

    // Find or create permission entry for this role
    let perm = entity.permissions.find((p) => p.role === role);
    let newPermissions: IPermission[];

    if (!perm) {
      // Create new permission entry
      perm = { role, actions: [] };
      newPermissions = [...entity.permissions, perm];
    } else {
      newPermissions = [...entity.permissions];
      perm = newPermissions.find((p) => p.role === role)!;
    }

    // Handle the '*' action specially
    if (action === '*') {
      if (currentlyHas) {
        // Remove all permissions
        perm.actions = [];
      } else {
        // Grant all permissions
        perm.actions = '*';
      }
    } else {
      // Toggle specific action
      if (perm.actions === '*') {
        // Converting from '*' to specific actions (excluding the toggled one)
        perm.actions = this.availableActions.filter((a) => a !== '*' && a !== action);
      } else {
        const actions = [...(perm.actions as PermissionAction[])];
        if (currentlyHas) {
          perm.actions = actions.filter((a) => a !== action);
        } else {
          perm.actions = [...actions, action];
        }
      }
    }

    this.configBuilder.updateEntity(entity.id, { permissions: newPermissions });
  }

  private getWarningType(role: string, action: PermissionAction): PermissionWarningType | null {
    const isAnonymous = role.toLowerCase() === 'anonymous';
    const isAuthenticated = role.toLowerCase() === 'authenticated';

    if (isAnonymous) {
      return 'anonymous-action';
    }

    if (isAuthenticated) {
      if (action === '*') return 'authenticated-all';
      if (action === 'create') return 'authenticated-create';
      if (action === 'update') return 'authenticated-update';
      if (action === 'delete') return 'authenticated-delete';
    }

    return null;
  }

  private async showWarning(
    type: PermissionWarningType,
    role: string,
    action?: PermissionAction,
    entityName?: string,
  ): Promise<boolean> {
    const warningKey = `${type}-${role}-${action || ''}-${entityName || ''}`;

    // Check if warning was suppressed
    if (this.suppressedWarnings().has(type)) {
      return true;
    }

    const warning = this.getWarningConfig(type, role, action, entityName);

    const modalRef = this.modalService.open(PermissionWarningModalComponent, {
      title: warning.title,
      centered: true,
      backdrop: 'static',
    });

    modalRef.componentInstance.warning = warning;

    try {
      const result = await modalRef.result;
      if (result?.suppress) {
        this.suppressedWarnings.update((set) => new Set([...set, type]));
      }
      return result?.proceed ?? false;
    } catch {
      return false;
    }
  }

  private getWarningConfig(
    type: PermissionWarningType,
    role: string,
    action?: PermissionAction,
    entityName?: string,
  ): IPermissionWarning {
    const warnings: Record<PermissionWarningType, IPermissionWarning> = {
      'anonymous-role': {
        type: 'anonymous-role',
        title: 'Anonymous Access Warning',
        message:
          'Adding anonymous access allows unauthenticated users to interact with your data. This may expose sensitive information to anyone.',
        suggestion:
          'Consider requiring authentication and using specific roles for access control.',
      },
      'anonymous-action': {
        type: 'anonymous-action',
        title: 'Anonymous Permission Warning',
        message: `Granting "${action}" permission to anonymous users means anyone can perform this action without authentication.`,
        suggestion:
          'Only allow anonymous access for truly public data that requires no protection.',
      },
      'authenticated-create': {
        type: 'authenticated-create',
        title: 'Broad Create Permission',
        message: `All authenticated users will be able to create records in "${entityName}". This could lead to unauthorized data creation.`,
        suggestion:
          'Consider using a specific role (e.g., "Editor", "Admin") instead of the general "authenticated" role.',
      },
      'authenticated-update': {
        type: 'authenticated-update',
        title: 'Broad Update Permission',
        message: `All authenticated users will be able to modify records in "${entityName}". This could allow users to modify data they shouldn't.`,
        suggestion: 'Use database policies or specific roles to restrict who can update records.',
      },
      'authenticated-delete': {
        type: 'authenticated-delete',
        title: 'Broad Delete Permission',
        message: `All authenticated users will be able to delete records from "${entityName}". This is a high-risk permission.`,
        suggestion: 'Delete permissions should typically be restricted to admin roles only.',
      },
      'authenticated-all': {
        type: 'authenticated-all',
        title: 'Full Permission Warning',
        message: `Granting all permissions (*) to authenticated users on "${entityName}" gives everyone full control. This is rarely appropriate.`,
        suggestion: 'Use granular permissions and specific roles for different operations.',
      },
    };

    return warnings[type];
  }
}
