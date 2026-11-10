import Phaser from 'phaser';

/**
 * Placeholder pixel art generated at boot. Every texture is referenced by key
 * so final art can replace it through the loader without code changes.
 */

type Draw = (g: Phaser.GameObjects.Graphics) => void;

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

const hex = (s: string) => Phaser.Display.Color.HexStringToColor(s).color;

function darken(color: number, f: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(c.red * f, c.green * f, c.blue * f);
}

export const CAR_TEX_W = 48;
export const CAR_TEX_H = 36;

/** Rear view of a car, used on track. Keyed by body and colour. */
export function carTexture(scene: Phaser.Scene, body: string, color: string): string {
  const key = `car-${body}-${color.replace('#', '')}`;
  const c = hex(color);
  const dark = darken(c, 0.62);
  make(scene, key, CAR_TEX_W, CAR_TEX_H, (g) => {
    g.fillStyle(0x000000, 0.35).fillEllipse(24, 33, 46, 6);
    g.fillStyle(0x16161c).fillRect(3, 24, 9, 10).fillRect(36, 24, 9, 10);
    if (body === 'roadster') {
      g.fillStyle(dark).fillRect(4, 14, 40, 14);
      g.fillStyle(c).fillRect(3, 15, 42, 11);
      g.fillStyle(0x9fc4e8).fillRect(12, 8, 24, 5);
      g.fillStyle(0x2a2a30).fillRect(14, 10, 6, 5).fillRect(28, 10, 6, 5);
    } else if (body === 'hatch') {
      g.fillStyle(dark).fillRect(4, 13, 40, 15);
      g.fillStyle(c).fillRect(3, 14, 42, 12).fillRect(8, 3, 32, 11);
      g.fillStyle(0x3b4c63).fillRect(11, 5, 26, 8);
    } else {
      g.fillStyle(dark).fillRect(4, 14, 40, 14);
      g.fillStyle(c).fillRect(3, 15, 42, 11);
      g.fillTriangle(9, 15, 15, 5, 15, 15)
        .fillTriangle(39, 15, 33, 5, 33, 15)
        .fillRect(15, 5, 18, 10);
      g.fillStyle(0x3b4c63).fillRect(16, 7, 16, 7);
    }
    g.fillStyle(0xff2a2a).fillRect(5, 17, 8, 3).fillRect(35, 17, 8, 3);
    g.fillStyle(0xeeeeee).fillRect(19, 20, 10, 4);
    g.fillStyle(0x222228).fillRect(4, 25, 40, 3);
  });
  return key;
}

/** Side view used in the town and garage. */
export function carSideTexture(scene: Phaser.Scene, body: string, color: string): string {
  const key = `carside-${body}-${color.replace('#', '')}`;
  const c = hex(color);
  make(scene, key, 64, 26, (g) => {
    g.fillStyle(0x000000, 0.3).fillEllipse(32, 24, 60, 4);
    g.fillStyle(c).fillRect(2, 11, 60, 9);
    if (body === 'hatch') g.fillRect(10, 3, 34, 9);
    else if (body === 'coupe')
      g.fillTriangle(12, 11, 22, 3, 22, 11)
        .fillRect(22, 3, 18, 8)
        .fillTriangle(40, 3, 52, 11, 40, 11);
    else g.fillRect(24, 7, 10, 4);
    g.fillStyle(0x3b4c63);
    if (body === 'hatch') g.fillRect(14, 5, 12, 6).fillRect(28, 5, 13, 6);
    else if (body === 'coupe') g.fillRect(23, 5, 15, 6);
    g.fillStyle(0x16161c).fillCircle(14, 20, 5).fillCircle(50, 20, 5);
    g.fillStyle(0x9a9aa6).fillCircle(14, 20, 2).fillCircle(50, 20, 2);
  });
  return key;
}

export function generateRaceTextures(scene: Phaser.Scene): void {
  make(scene, 'lamp', 14, 64, (g) => {
    g.fillStyle(0x3a3d48).fillRect(6, 6, 3, 58);
    g.fillRect(2, 4, 11, 3);
    g.fillStyle(0xffe9a8).fillRect(1, 7, 5, 2);
  });
  make(scene, 'palm', 40, 74, (g) => {
    g.fillStyle(0x8a6a44).fillRect(18, 20, 5, 54);
    g.fillStyle(0x2e8b3e);
    g.fillTriangle(20, 18, 0, 30, 6, 22).fillTriangle(20, 18, 40, 30, 34, 22);
    g.fillTriangle(20, 16, 4, 6, 10, 18).fillTriangle(20, 16, 36, 6, 30, 18).fillCircle(20, 18, 6);
  });
  make(scene, 'billboard', 70, 48, (g) => {
    g.fillStyle(0x3a3d48).fillRect(12, 28, 4, 20).fillRect(54, 28, 4, 20);
    g.fillStyle(0x7b2cff).fillRect(0, 0, 70, 30);
    g.fillStyle(0xc6ff2e).fillRect(4, 4, 62, 8);
    g.fillStyle(0xffffff).fillTriangle(30, 14, 40, 14, 33, 27).fillTriangle(36, 18, 44, 18, 34, 28);
  });
  make(scene, 'warehouse', 80, 45, (g) => {
    g.fillStyle(0x7a8a9a).fillRect(0, 8, 80, 37);
    g.fillStyle(0x5d6b7a).fillTriangle(0, 8, 40, 0, 80, 8);
    g.fillStyle(0x3c4652).fillRect(10, 20, 22, 25).fillRect(48, 20, 22, 25);
    g.fillStyle(0xd9b24a).fillRect(0, 14, 80, 2);
  });
  make(scene, 'crane', 60, 110, (g) => {
    g.fillStyle(0xe0612f);
    g.fillRect(22, 10, 5, 100).fillRect(36, 10, 5, 100).fillRect(0, 8, 60, 5);
    g.fillRect(22, 40, 19, 3).fillRect(22, 70, 19, 3);
    g.fillStyle(0x2b2b33).fillRect(48, 13, 1, 40).fillRect(44, 53, 9, 5);
  });
  make(scene, 'bollard', 6, 9, (g) => {
    g.fillStyle(0x2b2b33).fillRect(0, 2, 6, 7);
    g.fillStyle(0xf2c230).fillRect(0, 0, 6, 2);
  });
  make(scene, 'shopfront', 60, 48, (g) => {
    g.fillStyle(0xc98b5a).fillRect(0, 0, 60, 48);
    g.fillStyle(0x2c6e8f).fillRect(0, 14, 60, 5);
    g.fillStyle(0x9fc4e8).fillRect(6, 24, 20, 16).fillRect(34, 24, 20, 16);
    g.fillStyle(0x6b3f25).fillRect(26, 26, 8, 22);
  });
  make(scene, 'rock', 32, 22, (g) => {
    g.fillStyle(0x7d7468).fillTriangle(0, 22, 12, 2, 32, 22).fillTriangle(10, 22, 24, 6, 32, 22);
    g.fillStyle(0x968c7e).fillTriangle(6, 22, 12, 4, 18, 22);
  });
  make(scene, 'pine', 35, 80, (g) => {
    g.fillStyle(0x5a4030).fillRect(15, 64, 5, 16);
    g.fillStyle(0x1f5e3a).fillTriangle(17, 0, 2, 40, 33, 40).fillTriangle(17, 18, 0, 66, 35, 66);
  });
  make(scene, 'girder', 9, 70, (g) => {
    g.fillStyle(0x56606e).fillRect(2, 0, 5, 70);
    g.fillStyle(0x7a8696).fillRect(0, 0, 9, 4).fillRect(0, 30, 9, 3).fillRect(0, 60, 9, 3);
  });
  make(scene, 'lighthouse', 40, 150, (g) => {
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 ? 0xd7263d : 0xf2f2f2).fillRect(10 - i, 30 + i * 20, 20 + i * 2, 20);
    }
    g.fillStyle(0x2b2b33).fillRect(8, 18, 24, 12);
    g.fillStyle(0xffe9a8).fillRect(12, 20, 16, 8);
    g.fillStyle(0xd7263d).fillTriangle(6, 18, 20, 4, 34, 18);
  });
  make(scene, 'sky', 4, 120, (g) => {
    for (let y = 0; y < 120; y++) {
      const t = y / 120;
      g.fillStyle(Phaser.Display.Color.GetColor(70 + 100 * t, 120 + 70 * t, 200 + 30 * t)).fillRect(
        0,
        y,
        4,
        1,
      );
    }
  });
  make(scene, 'skyline', 256, 40, (g) => {
    g.fillStyle(0x6d87a8);
    const hs = [14, 22, 10, 30, 18, 26, 12, 34, 20, 16, 28, 12, 24, 18, 30, 10];
    hs.forEach((hh, i) => g.fillRect(i * 16, 40 - hh, 14, hh));
    g.fillStyle(0x587294).fillRect(0, 34, 256, 6);
  });
  make(scene, 'hills', 256, 30, (g) => {
    g.fillStyle(0x4d7a62);
    for (let i = 0; i < 8; i++) g.fillEllipse(i * 36 + 10, 30, 60, 26 + (i % 3) * 8);
  });
}

export interface Look {
  skin: string;
  hair: string;
  top: string;
  legs: string;
}

export const PLAYER_LOOK: Look = {
  skin: '#c98e6b',
  hair: '#2b2b2b',
  top: '#ffcc33',
  legs: '#2a3550',
};

/** A 16x28 person with two walk frames: `${key}-0`, `${key}-1`. */
export function personTextures(scene: Phaser.Scene, key: string, look: Look): string {
  for (const frame of [0, 1]) {
    make(scene, `${key}-${frame}`, 16, 28, (g) => {
      g.fillStyle(0x000000, 0.3).fillEllipse(8, 27, 12, 3);
      g.fillStyle(hex(look.legs));
      if (frame === 0) g.fillRect(4, 18, 3, 9).fillRect(9, 18, 3, 9);
      else g.fillRect(3, 18, 3, 8).fillRect(10, 18, 3, 9);
      g.fillStyle(hex(look.top)).fillRect(3, 9, 10, 10);
      g.fillStyle(hex(look.skin)).fillRect(5, 1, 6, 8).fillRect(1, 10, 2, 7).fillRect(13, 10, 2, 7);
      g.fillStyle(hex(look.hair)).fillRect(5, 0, 6, 3).fillRect(4, 1, 1, 4);
      g.fillStyle(0x1a1a1a).fillRect(9, 4, 1, 1);
    });
  }
  return key;
}

export function generateTownTextures(scene: Phaser.Scene): void {
  make(scene, 'town-sky', 4, 216, (g) => {
    for (let y = 0; y < 216; y++) {
      const t = y / 216;
      g.fillStyle(Phaser.Display.Color.GetColor(250 - 60 * t, 170 - 40 * t, 120 + 60 * t)).fillRect(
        0,
        y,
        4,
        1,
      );
    }
  });
  make(scene, 'town-sea', 256, 40, (g) => {
    g.fillStyle(0x2f5f8a).fillRect(0, 0, 256, 40);
    g.fillStyle(0x4b7fb0);
    for (let i = 0; i < 16; i++) g.fillRect((i * 37) % 256, 6 + ((i * 13) % 30), 10, 1);
    g.fillStyle(0xe8e4d8).fillRect(40, 2, 18, 4).fillRect(46, 0, 6, 2);
    g.fillStyle(0x6b6f7a).fillRect(170, 0, 40, 6);
  });
  make(scene, 'town-ground', 64, 48, (g) => {
    g.fillStyle(0x8c8a84).fillRect(0, 0, 64, 6);
    g.fillStyle(0x6e6c68).fillRect(0, 6, 64, 2);
    g.fillStyle(0x3f4048).fillRect(0, 8, 64, 40);
    g.fillStyle(0xd9b24a).fillRect(8, 26, 20, 2).fillRect(40, 26, 20, 2);
  });
  make(scene, 'bld-garage', 200, 120, (g) => {
    g.fillStyle(0x8e4b3a).fillRect(0, 0, 200, 120);
    g.fillStyle(0x7a3f30);
    for (let y = 6; y < 120; y += 8)
      for (let x = (y / 8) % 2 ? 0 : 10; x < 200; x += 20) g.fillRect(x, y, 18, 1);
    g.fillStyle(0x2c3440).fillRect(0, 0, 200, 22);
    g.fillStyle(0x5aa9e6).fillRect(0, 20, 200, 3);
    g.fillStyle(0xb8bcc4).fillRect(40, 44, 120, 76);
    g.fillStyle(0x9aa0aa);
    for (let y = 48; y < 120; y += 6) g.fillRect(40, y, 120, 1);
    g.fillStyle(0x2c3440).fillRect(170, 70, 22, 50);
  });
  make(scene, 'bld-shop', 180, 110, (g) => {
    g.fillStyle(0xd7c9b0).fillRect(0, 0, 180, 110);
    g.fillStyle(0xe05a9b).fillRect(0, 0, 180, 24);
    g.fillStyle(0xffffff).fillRect(6, 10, 168, 2);
    g.fillStyle(0x9fc4e8).fillRect(10, 40, 60, 46).fillRect(110, 40, 60, 46);
    g.fillStyle(0x2b2b33).fillRect(26, 70, 10, 16).fillRect(130, 64, 22, 22);
    g.fillStyle(0x6b3f25).fillRect(78, 46, 24, 64);
    g.fillStyle(0xffcc33).fillRect(96, 76, 3, 3);
  });
  make(scene, 'bld-lounge', 180, 110, (g) => {
    g.fillStyle(0x2c2440).fillRect(0, 0, 180, 110);
    g.fillStyle(0xc6ff2e).fillRect(20, 10, 140, 3).fillRect(20, 26, 140, 3);
    g.fillStyle(0x7b2cff).fillRect(0, 34, 180, 10);
    g.fillStyle(0x9b5de5);
    for (let x = 0; x < 180; x += 12) g.fillTriangle(x, 44, x + 12, 44, x + 6, 50);
    g.fillStyle(0xffd27a).fillRect(14, 56, 50, 34).fillRect(116, 56, 50, 34);
    g.fillStyle(0x111018).fillRect(78, 56, 24, 54);
  });
  make(scene, 'bld-trailer', 210, 90, (g) => {
    g.fillStyle(0x000000, 0.3).fillRect(6, 84, 198, 6);
    g.fillStyle(0xeeece6).fillRect(0, 10, 210, 66);
    g.fillStyle(0xf2a541).fillRect(0, 40, 210, 8);
    g.fillStyle(0x3b4c63).fillRect(20, 20, 40, 16).fillRect(150, 20, 40, 16);
    g.fillStyle(0xbab6ac).fillRect(92, 18, 26, 58);
    g.fillStyle(0x6e6c68).fillRect(88, 76, 34, 4).fillRect(92, 80, 26, 4);
    g.fillStyle(0x16161c).fillCircle(40, 80, 9).fillCircle(170, 80, 9);
  });
  make(scene, 'bld-gate', 130, 120, (g) => {
    g.fillStyle(0x56606e).fillRect(0, 10, 10, 110).fillRect(120, 10, 10, 110);
    for (let x = 0; x < 130; x += 10)
      for (let y = 0; y < 20; y += 10)
        g.fillStyle(((x + y) / 10) % 2 ? 0x111111 : 0xf2f2f2).fillRect(x, y, 10, 10);
    g.fillStyle(0xd7263d).fillRect(10, 22, 110, 6);
  });
  make(scene, 'town-lamp', 10, 70, (g) => {
    g.fillStyle(0x2b2d36).fillRect(4, 6, 2, 64).fillRect(0, 4, 10, 3);
    g.fillStyle(0xffe9a8).fillRect(1, 7, 8, 2);
  });
  make(scene, 'town-crate', 18, 14, (g) => {
    g.fillStyle(0x9a6b3c).fillRect(0, 0, 18, 14);
    g.fillStyle(0x6e4a28).fillRect(0, 0, 18, 2).fillRect(0, 6, 18, 1).fillRect(8, 0, 2, 14);
  });
  make(scene, 'interior-bench', 70, 26, (g) => {
    g.fillStyle(0x6e5a44).fillRect(0, 0, 70, 6);
    g.fillStyle(0x4a3c2e).fillRect(4, 6, 6, 20).fillRect(60, 6, 6, 20);
    g.fillStyle(0xb0b4bc).fillRect(10, -0, 8, 3).fillRect(26, 0, 12, 2);
  });
}
