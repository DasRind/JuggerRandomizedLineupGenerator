import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mainpage } from './mainpage';

describe('Mainpage', () => {
  let component: Mainpage;
  let fixture: ComponentFixture<Mainpage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mainpage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mainpage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
