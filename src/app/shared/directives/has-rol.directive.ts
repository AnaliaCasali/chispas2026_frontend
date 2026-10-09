
import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../core/models/user';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private authService   = inject(AuthService);
  private templateRef   = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);

  // ✅ Signal input: reactivo, tipado y obligatorio
  readonly appHasRole = input.required<Role[]>();

  constructor() {
    // ✅ effect() lee automáticamente:
    //    - el signal appHasRole (roles pedidos)
    //    - el signal userRole dentro de hasRole() (rol del usuario)
    //    Si cualquiera cambia, la vista se actualiza.
    effect(() => {
      const roles = this.appHasRole();
      const tieneRol = this.authService.hasRole(roles);

      if (tieneRol && this.viewContainer.length === 0) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      } else if (!tieneRol && this.viewContainer.length > 0) {
        this.viewContainer.clear();
      }
    });
  }
}
