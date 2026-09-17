import { test, expect, type Page } from '@playwright/test'

/**
 * The table node's pointer gestures, which are the part of it no type check or
 * unit test can reach: whether a press lands on the table or on React Flow's
 * node drag depends on real event propagation.
 *
 * Driven through the guest editor because it runs with no backend.
 */

const GUEST_URL = '/guest'

/** Drop a `columns` x `rows` table on the canvas and return its cells' locator. */
async function insertTable(page: Page, columns: number, rows: number) {
  await page.goto(GUEST_URL)
  await expect(page.locator('text=Components')).toBeVisible({ timeout: 10_000 })

  // A table's size is chosen before it exists, so the palette item opens a grid
  // picker rather than placing one directly.
  await page.getByText('Table', { exact: true }).click()
  await page.getByRole('button', { name: `${columns} by ${rows}` }).click()

  const cells = page.locator('[data-table-cell]')
  await expect(cells).toHaveCount(columns * rows)
  return cells
}

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[data-table-cell="${row},${col}"]`)

/** Which cells currently carry the selection overlay, as "row,col" strings. */
const selectedCells = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-table-cell]'))
      .filter((c) => c.querySelector('div.absolute.inset-0'))
      .map((c) => (c as HTMLElement).dataset.tableCell)
  )

test('an unselected table still drags from its body', async ({ page }) => {
  await insertTable(page, 3, 3)

  // Click elsewhere so the table is not selected, which is the state in which a
  // press on a cell belongs to React Flow rather than to the table.
  await page.locator('.react-flow__pane').click({ position: { x: 40, y: 40 } })

  const before = await cell(page, 1, 1).boundingBox()
  if (!before) throw new Error('table cells are not laid out')

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width / 2 + 80, before.y + before.height / 2 + 60, {
    steps: 10,
  })
  await page.mouse.up()

  const after = await cell(page, 1, 1).boundingBox()
  if (!after) throw new Error('table cells are not laid out')
  expect(after.x - before.x).toBeGreaterThan(50)
  expect(after.y - before.y).toBeGreaterThan(30)
})

test('a selected table moves from its grip, not its cells', async ({ page }) => {
  await insertTable(page, 3, 3)

  await cell(page, 1, 1).click()
  const before = await cell(page, 1, 1).boundingBox()
  if (!before) throw new Error('table cells are not laid out')

  const grip = await page.getByTitle('Row 2').boundingBox()
  if (!grip) throw new Error('row grip is not laid out')

  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + grip.width / 2 + 80, grip.y + grip.height / 2, { steps: 10 })
  await page.mouse.up()

  const after = await cell(page, 1, 1).boundingBox()
  if (!after) throw new Error('table cells are not laid out')
  expect(after.x - before.x).toBeGreaterThan(50)
})

test('a click selects one cell, once the table itself is selected', async ({ page }) => {
  await insertTable(page, 3, 3)

  // The first click lands on React Flow and selects the node; only then do the
  // cells take the pointer.
  await cell(page, 1, 1).click()
  expect(await selectedCells(page)).toEqual([])

  await cell(page, 1, 1).click()
  expect(await selectedCells(page)).toEqual(['1,1'])

  await cell(page, 2, 0).click()
  expect(await selectedCells(page)).toEqual(['2,0'])
})

test('a drag selects the rectangle between its ends', async ({ page }) => {
  await insertTable(page, 3, 3)
  await cell(page, 0, 0).click()

  const from = (await cell(page, 2, 2).boundingBox())!
  const to = (await cell(page, 1, 1).boundingBox())!

  // Dragged up and to the left, so the range has to normalize rather than
  // depending on which corner came first.
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 })
  await page.mouse.up()

  expect(await selectedCells(page)).toEqual(['1,1', '1,2', '2,1', '2,2'])
})

test('a grip selects its whole row or column', async ({ page }) => {
  await insertTable(page, 3, 3)
  await cell(page, 1, 1).click()

  await page.getByTitle('Column 2').click()
  expect(await selectedCells(page)).toEqual(['0,1', '1,1', '2,1'])

  await page.getByTitle('Row 3').click()
  expect(await selectedCells(page)).toEqual(['2,0', '2,1', '2,2'])
})

test('deselecting the table drops the cell selection with it', async ({ page }) => {
  await insertTable(page, 3, 3)
  await cell(page, 1, 1).click()
  await cell(page, 1, 1).click()
  expect(await selectedCells(page)).toEqual(['1,1'])

  await page.locator('.react-flow__pane').click({ position: { x: 40, y: 40 } })
  expect(await selectedCells(page)).toEqual([])
})
