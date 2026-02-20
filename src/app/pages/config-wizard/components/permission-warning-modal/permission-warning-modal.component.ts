import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { IPermissionWarning } from '../../../../models';

@Component({
  selector: 'app-permission-warning-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-header bg-warning-subtle">
      <h5 class="modal-title">
        <i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>
        {{ warning.title }}
      </h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="cancel()"></button>
    </div>

    <div class="modal-body">
      <p class="mb-3">{{ warning.message }}</p>

      <div class="alert alert-info mb-3">
        <strong>
          <i class="bi bi-lightbulb me-1"></i>
          Recommendation:
        </strong>
        <p class="mb-0 mt-1">{{ warning.suggestion }}</p>
      </div>

      <div class="form-check">
        <input
          type="checkbox"
          id="suppressWarning"
          class="form-check-input"
          [(ngModel)]="suppressChecked"
        />
        <label for="suppressWarning" class="form-check-label text-muted">
          Don't show this warning again this session
        </label>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-outline-secondary" (click)="cancel()">Cancel</button>
      <button type="button" class="btn btn-warning" (click)="proceed()">
        <i class="bi bi-check-lg me-1"></i>
        Proceed Anyway
      </button>
    </div>
  `,
  styles: `
    .modal-header.bg-warning-subtle {
      border-bottom-color: rgba(var(--bs-warning-rgb), 0.3);
    }
  `,
})
export class PermissionWarningModalComponent {
  @Input() warning!: IPermissionWarning;

  suppressChecked = false;

  constructor(private activeModal: NgbActiveModal) {}

  proceed(): void {
    this.activeModal.close({
      proceed: true,
      suppress: this.suppressChecked,
    });
  }

  cancel(): void {
    this.activeModal.dismiss();
  }
}
