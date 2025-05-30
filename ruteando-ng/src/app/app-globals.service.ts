import { Injectable } from '@angular/core';
import { AppGlobal, LayoutOptions } from './app.constants';

const DEFAULT_LAYOUT: LayoutOptions = {
  isFixed: true,
  isCollapsed: false,
  isBoxed: false,
  isRTL: false,
  horizontal: false,
  isFloat: false,
  asideHover: false,
  theme: null
};

@Injectable({ providedIn: 'root' })
export class AppGlobalsService {
  readonly app: AppGlobal = {
    name: 'Ruteando',
    description: '',
    year: new Date().getFullYear(),
    layout: { ...DEFAULT_LAYOUT },
    useFullLayout: false,
    hiddenFooter: false,
    viewAnimation: 'ng-fadeInUp'
  };

  readonly user = {
    name: 'John',
    job: 'ng-developer',
    picture: 'assets/user/02.jpg'
  };

  setRTL(value: boolean): void {
    this.app.layout.isRTL = value;
  }
}
