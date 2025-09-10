import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Generator } from './generator';

describe('Generator', () => {
  let component: Generator;
  let fixture: ComponentFixture<Generator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Generator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Generator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
