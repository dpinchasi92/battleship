import { expect, test, type Page } from '@playwright/test';
import { coordLabel, createRng, randomFleet, shipCells } from '../src/engine/index.ts';

const SEED = 4242;

async function openSetup(page: Page, level: string, query = `?view=2d&seed=${SEED}`) {
  await page.goto(query);
  await page.locator('.level-card', { hasText: level }).click();
  await page.getByTestId('set-sail').click();
}

test('menu offers every difficulty including the Cadet tutorial', async ({ page }) => {
  await page.goto('?view=2d');
  await expect(page.getByRole('heading', { name: 'Broadsides' })).toBeVisible();
  for (const level of ['Cadet', 'Deckhand', 'Captain', 'Admiral']) {
    await expect(page.locator('.level-card', { hasText: level })).toBeVisible();
  }
});

test('manual placement validates, rotates and unlocks Start Battle', async ({ page }) => {
  await openSetup(page, 'Deckhand');
  const start = page.getByTestId('start-battle');
  await expect(start).toBeDisabled();

  // A horizontal Man-o'-War cannot start at column 7: it would leave the board.
  await page.getByTestId('own-board-A7').click();
  await expect(page.getByTestId('own-board-A7')).toHaveAttribute('aria-label', /open sea/);

  await page.getByTestId('own-board-A1').click();
  await expect(page.getByTestId('own-board-A5')).toHaveAttribute('aria-label', /Man-o'-War/);

  await page.getByTestId('rotate').click();
  await page.getByTestId('own-board-C1').click();
  await expect(page.getByTestId('own-board-F1')).toHaveAttribute('aria-label', /Galleon/);

  await page.getByTestId('randomize').click();
  await expect(start).toBeEnabled();
});

test('a full seeded game can be won and replayed', async ({ page }) => {
  test.setTimeout(90_000);
  const rng = createRng(SEED);
  randomFleet(rng); // the player's Randomize click consumes the first fleet
  const enemy = randomFleet(rng);

  await openSetup(page, 'Deckhand');
  await page.getByTestId('randomize').click();
  await page.getByTestId('start-battle').click();

  const status = page.getByTestId('status');
  for (const placement of enemy) {
    for (const cell of shipCells(placement)) {
      if (await page.getByTestId('game-over').isVisible()) break;
      await expect(status).toContainText('Your turn');
      await page.getByTestId(`enemy-board-${coordLabel(cell)}`).click();
    }
  }

  await expect(page.getByTestId('game-over')).toContainText('Victory');
  await expect(page.getByTestId('game-over')).toContainText('100%');
  await page.getByTestId('play-again').click();
  await expect(page.getByTestId('start-battle')).toBeVisible();
});

test('cells cannot be fired at twice and the enemy fires back', async ({ page }) => {
  await openSetup(page, 'Captain');
  await page.getByTestId('randomize').click();
  await page.getByTestId('start-battle').click();

  const target = page.getByTestId('enemy-board-E5');
  await target.click();
  await expect(page.getByTestId('status')).toContainText('Your turn');
  await expect(target).toHaveAttribute('aria-label', /E5, (miss|hit|sunk)/);
  await expect(page.locator('.logbook li')).toHaveCount(2);

  await target.click({ force: true });
  await page.waitForTimeout(500);
  await expect(page.locator('.logbook li')).toHaveCount(2);
});

test('keyboard players can aim with arrows and fire with Enter', async ({ page }) => {
  await openSetup(page, 'Deckhand');
  await page.getByTestId('randomize').click();
  await page.getByTestId('start-battle').click();

  await page.getByTestId('enemy-board-E5').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('enemy-board-E6')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('announcer')).toContainText('E6');
});

test('mouse players can aim by hovering and fire with Space or Enter', async ({ page }) => {
  await openSetup(page, 'Deckhand');
  await page.getByTestId('randomize').click();
  await page.getByTestId('start-battle').click();
  await page.getByRole('switch', { name: 'Sound' }).click();

  await page.getByTestId('enemy-board-C3').hover();
  await expect(page.getByTestId('enemy-board-C3')).toHaveClass(/cell-aim/);
  await page.keyboard.press('Space');
  await expect(page.getByTestId('announcer')).toContainText('C3');
  await expect(page.getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'false');

  await expect(page.locator('.logbook li')).toHaveCount(2, { timeout: 5000 });
  await page.getByTestId('enemy-board-H8').hover();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('announcer')).toContainText('H8');
});

test('Cadet tutorial guides the player from setup into battle', async ({ page }) => {
  await openSetup(page, 'Cadet');
  const coach = page.getByTestId('coach');
  await expect(coach).toContainText('Ahoy, Cadet!');
  await page.getByTestId('coach-next').click();
  await expect(coach).toContainText('Position a ship');

  await page.getByTestId('own-board-A1').click();
  await expect(coach).toContainText('Complete the fleet');
  await page.getByTestId('randomize').click();
  await expect(coach).toContainText('Ready for battle');
  await page.getByTestId('start-battle').click();
  await expect(coach).toContainText('Your first broadside');

  await page.getByTestId('enemy-board-A1').click();
  await expect(coach).toContainText('Reading the result');
  await page.getByTestId('coach-next').click();
  await expect(coach).toContainText(/Hunting strategy|Finish it off/);

  await coach.getByRole('button', { name: 'Hint' }).click();
  await expect(coach).toContainText('Hint:');
  await expect(page.locator('.cell-hint')).toHaveCount(1);
});

test('3D view renders a WebGL canvas and lets the player switch to 2D', async ({ page }) => {
  await openSetup(page, 'Deckhand', `?view=3d&seed=${SEED}`);
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('switch', { name: '3D' }).click();
  await expect(page.getByTestId('own-board')).toBeVisible();
});

test('menu labels each opponent with its difficulty', async ({ page }) => {
  await page.goto('?view=2d');
  await expect(page.locator('.level-card', { hasText: 'Deckhand' })).toContainText('(Easy)');
  await expect(page.locator('.level-card', { hasText: 'Captain' })).toContainText('(Medium)');
  await expect(page.locator('.level-card', { hasText: 'Admiral' })).toContainText('(High)');
});

test('arrow keys steer the selected ship during setup and Enter drops it', async ({ page }) => {
  await openSetup(page, 'Deckhand');
  await page.getByTestId('pick-manOWar').click();
  await page.getByTestId('own-board-A1').hover();
  // Arrows move the ghost from where the mouse left it, clamped so the ship stays on the board.
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft']) {
    await page.keyboard.press(key);
  }
  await page.keyboard.press('Enter');
  // Man-o'-War (5) can start no further right than column 6; one step left lands it on B5–B9.
  await expect(page.getByTestId('own-board-B5')).toHaveAttribute('aria-label', /Man-o'-War/);
  await expect(page.getByTestId('own-board-B9')).toHaveAttribute('aria-label', /Man-o'-War/);
  await expect(page.getByTestId('own-board-B10')).toHaveAttribute('aria-label', /open sea/);
  await expect(page.getByTestId('pick-galleon')).toHaveAttribute('aria-pressed', 'true');
});
