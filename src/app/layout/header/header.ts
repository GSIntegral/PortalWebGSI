import { isPlatformBrowser } from '@angular/common';
import { Component, HostListener, inject, PLATFORM_ID, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../core/user/user.service';
import { Logo } from '../../shared/logo/logo';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, Logo],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);

  /** Usuario autenticado (emite tras el login / rehidratación del token). */
  readonly currentUser = toSignal(this.userService.user$);

  readonly navItems: NavItem[] = [
    { label: 'Inicio', path: '/' },
    { label: 'Quiénes Somos', path: '/quienes-somos' },
    { label: 'Aliados Estratégicos', path: '/aliados-estrategicos' },
    { label: 'Contáctanos', path: '/contactanos' },
    { label: 'Registro Fotográfico', path: '/registro-fotografico' },
  ];

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  logout() {
    this.closeMenu();
    this.authService.signOut().subscribe(() => {
      this.router.navigateByUrl('/').then(() => {
        if (isPlatformBrowser(this.platformId)) {
          location.reload();
        }
      });
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 12);
  }
}
