import Phaser from 'phaser';

/**
 * The game is laid out in a 384x216 world but drawn on a canvas twice that
 * size, with every camera zoomed in 2x. Shapes, text, scaled sprites and the
 * road are then drawn with pixels half the size, while all layout, physics
 * and art keep their 384x216 units.
 */
export const VIEW_W = 384;
export const VIEW_H = 216;
export const ZOOM = 2;
export const CANVAS_W = VIEW_W * ZOOM;
export const CANVAS_H = VIEW_H * ZOOM;

/**
 * The camera zooms about its centre (follow and bounds assume that), so a
 * scroll of (-OX, -OY) shows the world from (0, 0).
 */
export const OX = (VIEW_W * (ZOOM - 1)) / 2;
export const OY = (VIEW_H * (ZOOM - 1)) / 2;

/** Zooms a scene's main camera and, unless something moves it, shows the world from (0, 0). */
export function fitCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(ZOOM).setScroll(-OX, -OY);
}

/**
 * Where to place an object with scroll factor `sf` so it appears where it did
 * before the zoom: layers fixed to the screen, or scrolling partway.
 */
export const shiftX = (x: number, sf = 0) => x + OX * (1 - sf);
export const shiftY = (y: number, sf = 0) => y + OY * (1 - sf);
