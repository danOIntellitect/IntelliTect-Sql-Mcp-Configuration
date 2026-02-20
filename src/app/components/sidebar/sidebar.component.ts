import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { INavigationItem } from '../../models';
import { NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  navigationItems: INavigationItem[] = [
    { label: 'Config Builder', route: '/', icon: 'file-earmark-code' },
  ];

  constructor(public navigationService: NavigationService) {}

  closeSidebar(): void {
    this.navigationService.closeSidebar();
  }
}
