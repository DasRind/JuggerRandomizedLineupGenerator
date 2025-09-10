import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Lineup } from './lineup';

describe('Lineup', () => {
  let component: Lineup;
  let fixture: ComponentFixture<Lineup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lineup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Lineup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
