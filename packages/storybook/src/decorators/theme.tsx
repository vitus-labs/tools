import { Provider } from '@vitus-labs/unistyle'
// import { init } from '@vitus-labs/core'

// if (__VITUS_LABS_STORIES__.styles === 'styled-components') {
//   const styled = await import('styled-components')

//   init({
//     styled: styled.default,
//     css: styled.css,
//     provider: styled.ThemeProvider,
//   })
// }

export default (theme: any) => (Story: any) => (
  <Provider theme={theme}>
    <style
      dangerouslySetInnerHTML={{
        __html: `@import url(${__VITUS_LABS_STORIES__.font});`,
      }}
    />
    <Story />
  </Provider>
)
