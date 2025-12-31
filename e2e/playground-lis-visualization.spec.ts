import { expect, test } from '@playwright/test'

test.describe('playground: LIS 可视化（/lis-visualization）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lis-visualization')
  })

  test('默认输入应渲染完整视图', async ({ page }) => {
    await expect(page.getByTestId('lis-visualization')).toBeVisible()

    await expect(page.getByTestId('lis-input')).toHaveValue('2, 1, 3, 0, 4')

    const stepIndicator = page.getByTestId('lis-step-indicator')

    await expect(stepIndicator).toHaveAttribute('data-current-step', '0')
    await expect(stepIndicator).toHaveAttribute('data-last-step', '5')

    await expect(page.getByTestId('lis-prev')).toBeDisabled()
    await expect(page.getByTestId('lis-next')).toBeEnabled()
    await expect(page.getByTestId('lis-reset')).toBeEnabled()

    await expect(
      page.getByTestId('lis-array-container').locator('[data-testid^="lis-array-cell-"]'),
    ).toHaveCount(5)

    await expect(page.getByTestId('lis-sequence-section')).toBeVisible()
    await expect(page.getByTestId('lis-predecessors-section')).toBeVisible()
    await expect(page.getByTestId('lis-action-panel')).toBeVisible()
  })

  test('点击下一步与重置应更新步骤', async ({ page }) => {
    const stepIndicator = page.getByTestId('lis-step-indicator')

    await page.getByTestId('lis-next').click()
    await expect(stepIndicator).toHaveAttribute('data-current-step', '1')

    await page.getByTestId('lis-reset').click()
    await expect(stepIndicator).toHaveAttribute('data-current-step', '0')
  })

  test('清空输入应切换到空状态视图', async ({ page }) => {
    await page.getByTestId('lis-input-clear').click()

    await expect(page.getByTestId('lis-empty-state')).toBeVisible()
    await expect(page.getByTestId('lis-step-controls')).toHaveCount(0)
    await expect(page.getByTestId('lis-array-display')).toHaveCount(0)
    await expect(page.getByTestId('lis-sequence-section')).toHaveCount(0)
    await expect(page.getByTestId('lis-predecessors-section')).toHaveCount(0)
    await expect(page.getByTestId('lis-action-panel')).toHaveCount(0)

    await expect(page.getByTestId('lis-input')).toHaveValue('')
  })

  test('输入变更后应重置步骤并支持索引跳转', async ({ page }) => {
    const input = page.getByTestId('lis-input')

    await input.fill('1 2')

    const stepIndicator = page.getByTestId('lis-step-indicator')

    await expect(stepIndicator).toHaveAttribute('data-current-step', '0')
    await expect(stepIndicator).toHaveAttribute('data-last-step', '2')
    await expect(
      page.getByTestId('lis-array-container').locator('[data-testid^="lis-array-cell-"]'),
    ).toHaveCount(2)

    await page.getByTestId('lis-array-cell-1').click()
    await expect(stepIndicator).toHaveAttribute('data-current-step', '2')
  })

  test('键盘快捷键可导航步骤', async ({ page }) => {
    const stepIndicator = page.getByTestId('lis-step-indicator')

    await page.getByTestId('lis-visualization').click()
    await page.keyboard.press('End')
    await expect(stepIndicator).toHaveAttribute('data-current-step', '5')

    await page.keyboard.press('Home')
    await expect(stepIndicator).toHaveAttribute('data-current-step', '0')

    await page.keyboard.press('ArrowRight')
    await expect(stepIndicator).toHaveAttribute('data-current-step', '1')

    await page.keyboard.press('ArrowLeft')
    await expect(stepIndicator).toHaveAttribute('data-current-step', '0')
  })
})
