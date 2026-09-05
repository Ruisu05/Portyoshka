import type { Platform, PortConfig } from '../../shared/types';
import { shipwright } from './ports/shipwright';
import { twoShipTwoHarkinian } from './ports/2ship2harkinian';
import { starship } from './ports/starship';
import { ghostship } from './ports/ghostship';
import { spaghettiKart } from './ports/spaghettiKart';
import { lighthouse } from './ports/lighthouse';
import { dusklight } from './ports/dusklight';
import { gen1recomp } from './ports/gen1recomp';
import { banjoRecomp } from './ports/banjorecomp';
import { bm64Recomp } from './ports/bm64recomp';
import { bmHeroRecomp } from './ports/bmherorecomp';
import { dinoRecomp } from './ports/dinorecomp';
import { dk64Recomp } from './ports/dk64recomp';
import { perfectDark } from './ports/perfectdark';
import { drMario64 } from './ports/drmario64';
import { extremeGRecomp } from './ports/extremegrecomp';
import { goemon64Recomp } from './ports/goemon64recomp';
import { harvestMoon64Recomp } from './ports/harvestmoon64recomp';
import { megaMan64Recompiled } from './ports/megaman64recompiled';
import { quest64Recomp } from './ports/quest64recomp';
import { snowboardKids2Recomp } from './ports/snowboardkids2recomp';
import { sssvRecomp } from './ports/sssvrecomp';
import { wcwRecomp } from './ports/wcwrecomp';
import { revengeRecomp } from './ports/revengerecomp';
import { zelda64Recomp } from './ports/zelda64recomp';

export const REGISTRY_PORTS: PortConfig[] = [
  shipwright,
  twoShipTwoHarkinian,
  starship,
  ghostship,
  spaghettiKart,
  lighthouse,
  dusklight,
  gen1recomp,
  banjoRecomp,
  bm64Recomp,
  bmHeroRecomp,
  dinoRecomp,
  dk64Recomp,
  perfectDark,
  drMario64,
  extremeGRecomp,
  goemon64Recomp,
  harvestMoon64Recomp,
  megaMan64Recompiled,
  quest64Recomp,
  snowboardKids2Recomp,
  sssvRecomp,
  wcwRecomp,
  revengeRecomp,
  zelda64Recomp,
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
