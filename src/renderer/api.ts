import type { PortyoshkaApi } from '../shared/types';

declare global {
  interface Window {
    portyoshka: PortyoshkaApi;
  }
}

export const api = window.portyoshka;
