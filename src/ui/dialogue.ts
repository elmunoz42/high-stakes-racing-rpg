/** Placeholder until the dialogue overlay lands (M1 task 9). */
export function openDialogue(characterId: string, onClose: () => void): void {
  console.info('[dialogue] open', characterId);
  onClose();
}
