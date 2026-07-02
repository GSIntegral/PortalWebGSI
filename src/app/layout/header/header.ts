import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);

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

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 12);
  }
}
