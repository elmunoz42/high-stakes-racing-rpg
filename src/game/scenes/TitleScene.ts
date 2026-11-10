import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const g = this.add.graphics();
    for (let i = 0; i < 216; i += 4) {
      const t = i / 216;
      g.fillStyle(Phaser.Display.Color.GetColor(20 + 120 * t, 10 + 30 * t, 60 + 40 * (1 - t)), 1);
      g.fillRect(0, i, 384, 4);
    }
    this.add
      .text(192, 60, 'RACING RPG', { fontFamily: 'monospace', fontSize: '24px', color: '#ffcc33' })
      .setOrigin(0.5);
  }
}
