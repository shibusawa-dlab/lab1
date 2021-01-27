import { mount } from '@vue/test-utils'
import Logo from '@/components/Grid.vue'

describe('Logo', () => {
  test('コンポーネントが存在する', () => {
    // Logoコンポーネントをマウントする
    const wrapper = mount(Logo)
    // expect()の中身がtrueだったらテスト合格
    expect(wrapper.exists()).toBeTruthy()
  })
})
