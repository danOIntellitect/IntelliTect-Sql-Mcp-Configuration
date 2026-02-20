import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfigBuilderService } from '../../../../services/config-builder.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-json-preview-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (configBuilder.previewOpen()) {
      <aside class="preview-panel">
        <div class="preview-header">
          <h5 class="mb-0">
            <i class="bi bi-code-square me-2"></i>
            Configuration Preview
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close preview"
            (click)="configBuilder.togglePreview()"
          ></button>
        </div>

        <div class="preview-actions">
          <button type="button" class="btn btn-sm btn-outline-primary" (click)="copyToClipboard()">
            <i class="bi bi-clipboard me-1"></i>
            Copy
          </button>
          <button type="button" class="btn btn-sm btn-primary" (click)="download()">
            <i class="bi bi-download me-1"></i>
            Download
          </button>
        </div>

        <div class="preview-content">
          <pre class="json-preview"><code [innerHTML]="highlightedJson()"></code></pre>
        </div>
      </aside>
    }
  `,
  styles: `
    .preview-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 450px;
      height: 100vh;
      background: var(--bs-body-bg);
      border-left: 1px solid var(--bs-border-color);
      display: flex;
      flex-direction: column;
      z-index: 1040;
      box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid var(--bs-border-color);
      background: var(--bs-tertiary-bg);
    }

    .preview-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--bs-border-color);
    }

    .preview-content {
      flex: 1;
      overflow: auto;
      padding: 0;
    }

    .json-preview {
      margin: 0;
      padding: 1rem;
      font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
      font-size: 0.8rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
      background: transparent;
      border: none;
    }

    .json-preview code {
      font-family: inherit;
    }

    /* JSON Syntax Highlighting */
    :host ::ng-deep .json-key {
      color: #0550ae;
    }

    :host ::ng-deep .json-string {
      color: #0a3069;
    }

    :host ::ng-deep .json-number {
      color: #0550ae;
    }

    :host ::ng-deep .json-boolean {
      color: #cf222e;
    }

    :host ::ng-deep .json-null {
      color: #6e7781;
    }

    :host ::ng-deep .json-punctuation {
      color: #24292f;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      :host ::ng-deep .json-key {
        color: #79c0ff;
      }

      :host ::ng-deep .json-string {
        color: #a5d6ff;
      }

      :host ::ng-deep .json-number {
        color: #79c0ff;
      }

      :host ::ng-deep .json-boolean {
        color: #ff7b72;
      }

      :host ::ng-deep .json-null {
        color: #8b949e;
      }

      :host ::ng-deep .json-punctuation {
        color: #c9d1d9;
      }
    }

    [data-bs-theme='dark'] {
      :host ::ng-deep .json-key {
        color: #79c0ff;
      }

      :host ::ng-deep .json-string {
        color: #a5d6ff;
      }

      :host ::ng-deep .json-number {
        color: #79c0ff;
      }

      :host ::ng-deep .json-boolean {
        color: #ff7b72;
      }

      :host ::ng-deep .json-null {
        color: #8b949e;
      }

      :host ::ng-deep .json-punctuation {
        color: #c9d1d9;
      }
    }

    @media (max-width: 768px) {
      .preview-panel {
        width: 100%;
      }
    }
  `,
})
export class JsonPreviewPanelComponent {
  protected readonly configBuilder = inject(ConfigBuilderService);
  private readonly notifications = inject(NotificationService);

  highlightedJson(): string {
    const json = this.configBuilder.configJson();
    return this.syntaxHighlight(json);
  }

  async copyToClipboard(): Promise<void> {
    const success = await this.configBuilder.copyToClipboard();
    if (success) {
      this.notifications.success('Copied to clipboard');
    } else {
      this.notifications.error('Failed to copy to clipboard');
    }
  }

  download(): void {
    this.configBuilder.downloadAsFile();
    this.notifications.success('Downloaded dab-config.json');
  }

  private syntaxHighlight(json: string): string {
    // Escape HTML
    let escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Apply syntax highlighting
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';

        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
            // Remove the colon for styling, then add it back
            match = match.slice(0, -1);
            return `<span class="${cls}">${match}</span><span class="json-punctuation">:</span>`;
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }

        return `<span class="${cls}">${match}</span>`;
      },
    );
  }
}
