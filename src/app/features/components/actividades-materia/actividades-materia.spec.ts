import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ActividadesMateriaComponent } from './actividades-materia';
import { CarpetaService } from '../../services/carpeta.service';

describe('ActividadesMateriaComponent', () => {
  let component: ActividadesMateriaComponent;
  let fixture: ComponentFixture<ActividadesMateriaComponent>;

  const carpetaServiceMock = {
    obtenerActividadesDeMateria: () =>
      of({
        carpetaEspacioId: 1,
        materia: 'Lengua y Literatura',
        color: '#2563eb',
        icono: 'book',
        mensaje: '',
        actividades: [],
      }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActividadesMateriaComponent],
      providers: [
        provideRouter([]),
        { provide: CarpetaService, useValue: carpetaServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '1' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActividadesMateriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});