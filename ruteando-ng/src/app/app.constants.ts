export const APP_COLORS = {
  primary: '#5d9cec',
  success: '#27c24c',
  info: '#23b7e5',
  warning: '#ff902b',
  danger: '#f05050',
  inverse: '#131e26',
  green: '#37bc9b',
  pink: '#f532e5',
  purple: '#7266ba',
  dark: '#3a3f51',
  yellow: '#fad732',
  grayDarker: '#232735',
  grayDark: '#3a3f51',
  gray: '#dde6e9',
  grayLight: '#e4eaec',
  grayLighter: '#edf1f2'
};

export interface LayoutOptions {
  isFixed: boolean;
  isCollapsed: boolean;
  isBoxed: boolean;
  isRTL: boolean;
  horizontal: boolean;
  isFloat: boolean;
  asideHover: boolean;
  theme: string | null;
}

export interface AppGlobal {
  name: string;
  description: string;
  year: number;
  layout: LayoutOptions;
  useFullLayout: boolean;
  hiddenFooter: boolean;
  viewAnimation: string;
}
