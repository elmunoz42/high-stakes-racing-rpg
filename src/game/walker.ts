import Phaser from 'phaser';
import { typing } from '../ui/dom.ts';

const WALK_SPEED = 78; // px/s

/** Side-scroller walking for the player: arrows or A/D, two-frame animation. */
export class Walker {
  readonly sprite: Phaser.GameObjects.Image;
  private keys: Record<'left' | 'right' | 'a' | 'd', Phaser.Input.Keyboard.Key>;
  private frameTime = 0;
  private frame = 0;
  frozen = false;

  constructor(
    scene: Phaser.Scene,
    private textureKey: string,
    x: number,
    groundY: number,
    private minX: number,
    private maxX: number,
  ) {
    this.sprite = scene.add.image(x, groundY, `${textureKey}-0`).setOrigin(0.5, 1).setDepth(50);
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT, false),
      right: kb.addKey(K.RIGHT, false),
      a: kb.addKey(K.A, false),
      d: kb.addKey(K.D, false),
    };
  }

  get x(): number {
    return this.sprite.x;
  }

  set x(v: number) {
    this.sprite.x = Math.max(this.minX, Math.min(this.maxX, v));
  }

  update(dt: number): void {
    const k = this.keys;
    const dir =
      this.frozen || typing()
        ? 0
        : (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    if (dir !== 0) {
      this.x = this.x + dir * WALK_SPEED * dt;
      this.sprite.setFlipX(dir < 0);
      this.frameTime += dt;
      if (this.frameTime > 0.16) {
        this.frameTime = 0;
        this.frame = 1 - this.frame;
        this.sprite.setTexture(`${this.textureKey}-${this.frame}`);
      }
    } else if (this.frame !== 0) {
      this.frame = 0;
      this.sprite.setTexture(`${this.textureKey}-0`);
    }
  }
}
