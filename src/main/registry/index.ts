import type { Platform, PortConfig } from '../../shared/types';
import { shipwright } from './ports/shipwright';
import { twoShipTwoHarkinian } from './ports/2ship2harkinian';
import { starship } from './ports/starship';
import { ghostship } from './ports/ghostship';
import { spaghettiKart } from './ports/spaghettiKart';
import { lighthouse } from './ports/lighthouse';
import { dusklight } from './ports/dusklight';

export const REGISTRY_PORTS: PortConfig[] = [
  shipwright,
  twoShipTwoHarkinian,
  starship,
  ghostship,
  spaghettiKart,
  lighthouse,
  dusklight,
];

export function getPort(id: string): PortConfig | undefined {
  return REGISTRY_PORTS.find((p) => p.id === id);
}

export function isSupportedOnPlatform(port: PortConfig, platform: Platform): boolean {
  return Boolean(port.assetPattern[platform] && port.executable[platform]);
}

export function visiblePortsOn(platform: Platform): PortConfig[] {
  return REGISTRY_PORTS.filter((p) => isSupportedOnPlatform(p, platform));
}
