import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { InicioComponent } from './inicio';
import { InicioService } from '../../services/inicio.service';

describe('InicioComponent', () => {
  let component: InicioComponent;
  let fixture: ComponentFixture<InicioComponent>;

  // Mock básico del servicio para no disparar peticiones HTTP reales durante las pruebas
  const inicioServiceMock = {
    obtenerInicio: () => of({
      hayClaseAhora: false,
      mensaje: 'Ahora no tienes clases',
      materias: []
    })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [
        provideRouter([]),
        { provide: InicioService, useValue: inicioServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});