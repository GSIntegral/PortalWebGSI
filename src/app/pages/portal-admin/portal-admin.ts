import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortalCompanies } from './companies/portal-companies';
import { PortalUsers } from './users/portal-users';

type AdminTab = 'empresas' | 'usuarios';

/**
 * Administración del portal (HU_079), solo para el equipo de GS Integral: crea las empresas que
 * aparecen en el tablero y los usuarios del portal que podrán ver únicamente su empresa.
 */
@Component({
  selector: 'app-portal-admin',
  imports: [RouterLink, PortalCompanies, PortalUsers],
  templateUrl: './portal-admin.html',
  styleUrl: './portal-admin.scss',
})
export class PortalAdmin {
  readonly activeTab = signal<AdminTab>('empresas');

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
  }
}
