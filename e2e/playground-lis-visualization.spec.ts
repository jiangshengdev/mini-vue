import { expect, test } from '@playwright/test'

test.describe('playground: LIS 可视化（/lis-visualization）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lis-visualization')
  })

  test('默认输入应渲染完整视图', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'LIS 算法可视化' })).toBeVisible()
    await expect(page.getByText('第 0 步 / 共 5 步')).toBeVisible()

    const input = page.getByPlaceholder('例如：2, 1, 3, 0, 4')

    await expect(input).toHaveValue('2, 1, 3, 0, 4')

    await expect(page.getByRole('button', { name: '上一步' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '下一步' })).toBeEnabled()
    await expect(page.getByTitle('重置（Home）')).toBeEnabled()

    await expect(page.locator('[title^="点击跳转到第"]')).toHaveCount(5)
    await expect(page.getByText('Sequence State:')).toBeVisible()
    await expect(page.getByText('Predecessors:')).toBeVisible()
    await expect(page.getByRole('heading', { name: '操作' })).toBeVisible()
  })

  test('点击下一步与重置应更新步骤', async ({ page }) => {
    await page.getByRole('button', { name: '下一步' }).click()
    await expect(page.getByText('第 1 步 / 共 5 步')).toBeVisible()

    await page.getByTitle('重置（Home）').click()
    await expect(page.getByText('第 0 步 / 共 5 步')).toBeVisible()
  })

  test('清空输入应切换到空状态视图', async ({ page }) => {
    await page.getByTitle('清空输入').click()

    await expect(page.getByText('请输入数组以开始可视化')).toBeVisible()
    await expect(page.locator('[title^="点击跳转到第"]')).toHaveCount(0)
    await expect(page.getByTitle('自动播放/暂停（Space）')).toHaveCount(0)

    const input = page.getByPlaceholder('例如：2, 1, 3, 0, 4')

    await expect(input).toHaveValue('')
  })

  test('输入变更后应重置步骤并支持索引跳转', async ({ page }) => {
    const input = page.getByPlaceholder('例如：2, 1, 3, 0, 4')

    await input.fill('1 2')

    await expect(page.getByText('第 0 步 / 共 2 步')).toBeVisible()
    await expect(page.locator('[title^="点击跳转到第"]')).toHaveCount(2)

    await page.getByTitle('点击跳转到第 2 步').click()
    await expect(page.getByText('第 2 步 / 共 2 步')).toBeVisible()
  })

  test('键盘快捷键可导航步骤', async ({ page }) => {
    await page.getByRole('heading', { name: 'LIS 算法可视化' }).click()

    await page.keyboard.press('End')
    await expect(page.getByText('第 5 步 / 共 5 步')).toBeVisible()

    await page.keyboard.press('Home')
    await expect(page.getByText('第 0 步 / 共 5 步')).toBeVisible()

    await page.keyboard.press('ArrowRight')
    await expect(page.getByText('第 1 步 / 共 5 步')).toBeVisible()

    await page.keyboard.press('ArrowLeft')
    await expect(page.getByText('第 0 步 / 共 5 步')).toBeVisible()
  })
})
