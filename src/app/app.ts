import { Component, signal } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { NavegacionComponent } from './shared/components/navegacion/navegacion';

@Component({
  imports: [RouterModule, NavegacionComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('chispas2026_frontend');
}
