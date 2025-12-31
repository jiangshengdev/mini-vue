import { expect, test } from '@playwright/test'

test.describe('playground: 基础示例（/basic）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('基础示例入口页可渲染', async ({ page }) => {
    const nav = page.locator('nav.nav')

    await nav.getByRole('link', { name: '基础示例' }).click()

    await expect(page).toHaveURL(/\/basic$/)
    await expect(page.getByTestId('basic-index')).toBeVisible()
    await expect(page.getByRole('heading', { name: '基础示例' })).toBeVisible()
  })

  test('你好，世界可渲染默认消息', async ({ page }) => {
    const nav = page.locator('nav.nav')

    await nav.getByRole('link', { name: '你好，世界' }).click()

    await expect(page).toHaveURL(/\/basic\/hello-world$/)
    await expect(page.getByTestId('basic-hello-world')).toBeVisible()
    await expect(page.getByTestId('basic-hello-world-message')).toHaveText('你好，世界！')
  })

  test('处理用户输入：反转、追加、阻止默认跳转', async ({ page }) => {
    const nav = page.locator('nav.nav')

    await nav.getByRole('link', { name: '处理用户输入' }).click()

    await expect(page).toHaveURL(/\/basic\/handling-user-input$/)

    const message = page.getByTestId('basic-handling-user-input-message')

    await expect(message).toHaveText('你好，世界！')

    await page.getByTestId('basic-handling-user-input-reverse').click()
    await expect(message).toHaveText('！界世，好你')

    await page.getByTestId('basic-handling-user-input-append').click()
    await expect(message).toHaveText('！界世，好你！')

    const dialogHandled = (async () => {
      const dialog = await page.waitForEvent('dialog', { timeout: 5000 })

      expect(dialog.message()).toBe('导航已被阻止。')
      await dialog.accept()
    })()

    await page.getByTestId('basic-handling-user-input-prevent-default').click({ noWaitAfter: true })
    await dialogHandled

    await expect(page).toHaveURL(/\/basic\/handling-user-input$/)
  })

  test('属性绑定：title、class 与 style 切换', async ({ page }) => {
    const nav = page.locator('nav.nav')

    await nav.getByRole('link', { name: '属性绑定' }).click()

    await expect(page).toHaveURL(/\/basic\/attribute-bindings$/)

    await expect(page.getByTestId('attribute-bindings-title')).toHaveAttribute(
      'title',
      '你好，世界！',
    )

    const redToggle = page.getByTestId('attribute-bindings-toggle-red')

    await expect(redToggle).toHaveCSS('color', 'rgb(255, 0, 0)')
    await redToggle.click()
    await expect(redToggle).not.toHaveCSS('color', 'rgb(255, 0, 0)')
    await redToggle.click()
    await expect(redToggle).toHaveCSS('color', 'rgb(255, 0, 0)')

    const colorToggle = page.getByTestId('attribute-bindings-toggle-color')

    await expect(colorToggle).toHaveCSS('color', 'rgb(0, 128, 0)')
    await colorToggle.click()
    await expect(colorToggle).toHaveCSS('color', 'rgb(0, 0, 255)')
    await colorToggle.click()
    await expect(colorToggle).toHaveCSS('color', 'rgb(0, 128, 0)')
  })

  test('条件与循环：显示、追加、移除、反转与空列表', async ({ page }) => {
    const nav = page.locator('nav.nav')

    await nav.getByRole('link', { name: '条件与循环' }).click()

    await expect(page).toHaveURL(/\/basic\/conditionals-and-loops$/)

    const list = page.getByTestId('conditionals-and-loops-list')

    await expect(list.locator('li')).toHaveText(['1', '2', '3'])

    await page.getByTestId('conditionals-and-loops-reverse').click()
    await expect(list.locator('li')).toHaveText(['3', '2', '1'])

    await page.getByTestId('conditionals-and-loops-push').click()
    await expect(list.locator('li')).toHaveText(['3', '2', '1', '4'])

    await page.getByTestId('conditionals-and-loops-pop').click()
    await expect(list.locator('li')).toHaveText(['3', '2', '1'])

    await page.getByTestId('conditionals-and-loops-toggle').click()
    await expect(page.getByTestId('conditionals-and-loops-hidden')).toBeVisible()

    await page.getByTestId('conditionals-and-loops-toggle').click()
    await expect(list.locator('li')).toHaveText(['3', '2', '1'])

    await page.getByTestId('conditionals-and-loops-pop').click()
    await page.getByTestId('conditionals-and-loops-pop').click()
    await page.getByTestId('conditionals-and-loops-pop').click()
    await expect(page.getByTestId('conditionals-and-loops-empty')).toBeVisible()
  })

  test('表单绑定：v-model 基本行为', async ({ page }) => {
    const nav = page.locator('nav.nav')

    await nav.getByRole('link', { name: '表单绑定' }).click()

    await expect(page).toHaveURL(/\/basic\/form-bindings$/)
    await expect(page.getByTestId('basic-form-bindings')).toBeVisible()

    const textInput = page.getByTestId('form-bindings-text-input')
    const textOutput = page.getByTestId('form-bindings-text-output')

    await expect(textOutput).toHaveText('当前值：编辑我')
    await textInput.fill('你好')
    await expect(textOutput).toHaveText('当前值：你好')

    const singleCheckboxLabel = page
      .getByTestId('basic-form-bindings')
      .locator('label[for="checkbox"]')

    await expect(singleCheckboxLabel).toHaveText('已勾选：true')
    await page.getByTestId('form-bindings-single-checkbox').click()
    await expect(singleCheckboxLabel).toHaveText('已勾选：false')

    const checkedNamesOutput = page.getByTestId('form-bindings-checked-names-output')

    await expect(checkedNamesOutput).toHaveText('已勾选姓名：Jack')
    await page.getByTestId('basic-form-bindings').getByLabel('John').click()
    await page.getByTestId('basic-form-bindings').getByLabel('Mike').click()
    await expect(checkedNamesOutput).toHaveText('已勾选姓名：Jack, John, Mike')
    await page.getByTestId('basic-form-bindings').getByLabel('Jack').click()
    await expect(checkedNamesOutput).toHaveText('已勾选姓名：John, Mike')

    const radioGroup = page
      .getByTestId('basic-form-bindings')
      .getByRole('heading', { name: '单选框' })
      .locator('..')
    const radioOutput = radioGroup.locator('p')

    await expect(radioOutput).toHaveText('已选择：选项一')
    await radioGroup.getByLabel('选项二').click()
    await expect(radioOutput).toHaveText('已选择：选项二')

    const singleSelect = page.getByTestId('form-bindings-single-select')
    const singleSelectOutput = page.getByTestId('form-bindings-single-select-output')

    await expect(singleSelectOutput).toHaveText('已选择：A')
    await singleSelect.selectOption('B')
    await expect(singleSelectOutput).toHaveText('已选择：B')

    const multiSelect = page.getByTestId('form-bindings-multi-select')
    const multiSelectOutput = page.getByTestId('form-bindings-multi-select-output')

    await expect(multiSelectOutput).toHaveText('已选择：A')
    await multiSelect.selectOption(['A', 'C'])
    await expect(multiSelectOutput).toHaveText('已选择：A, C')
  })

  test('简单组件：列表项可渲染', async ({ page }) => {
    const nav = page.locator('nav.nav')

    await nav.getByRole('link', { name: '简单组件' }).click()

    await expect(page).toHaveURL(/\/basic\/simple-component$/)
    await expect(page.getByTestId('basic-simple-component')).toBeVisible()

    const items = page.getByTestId('basic-simple-component').locator('ol > li')

    await expect(items).toHaveText(['蔬菜', '奶酪', '人类应该吃的其他东西'])
  })
})
