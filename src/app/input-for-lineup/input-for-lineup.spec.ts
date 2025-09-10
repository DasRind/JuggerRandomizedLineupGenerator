import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputForLineup } from './input-for-lineup';

describe('InputForLineup', () => {
  let component: InputForLineup;
  let fixture: ComponentFixture<InputForLineup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputForLineup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputForLineup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
