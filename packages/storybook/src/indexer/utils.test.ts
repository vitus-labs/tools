import { describe, expect, it } from 'vitest'
import {
  deriveTitle,
  detectComponentKind,
  extractComponentName,
  extractDimensionNames,
  extractExplicitTitle,
  extractNamedExports,
  isReactComponent,
  isRocketstoriesPattern,
  isRocketstyleComponent,
} from './utils.js'

describe('isRocketstoriesPattern', () => {
  it('should detect stories.init() pattern', () => {
    expect(isRocketstoriesPattern('export default stories.init()')).toBe(true)
  })

  it('should detect stories.init pattern (no parens)', () => {
    expect(isRocketstoriesPattern('export default stories.init')).toBe(true)
  })

  it('should detect with different variable names', () => {
    expect(isRocketstoriesPattern('export default myStories.init()')).toBe(true)
    expect(isRocketstoriesPattern('export default myStories.init')).toBe(true)
  })

  it('should not match standard CSF default export', () => {
    expect(
      isRocketstoriesPattern(
        "export default { title: 'Badge', component: Badge }",
      ),
    ).toBe(false)
  })

  it('should not match init() in non-default context', () => {
    expect(isRocketstoriesPattern('const result = stories.init()')).toBe(false)
  })
})

describe('isRocketstyleComponent', () => {
  it('should detect .config() pattern', () => {
    expect(isRocketstyleComponent('component.config({ name: "Badge" })')).toBe(
      true,
    )
  })

  it('should detect .theme() pattern', () => {
    expect(isRocketstyleComponent('component.theme(myTheme)')).toBe(true)
  })

  it('should detect .states() pattern', () => {
    expect(isRocketstyleComponent('component.states({ active: true })')).toBe(
      true,
    )
  })

  it('should detect .readOnly() pattern', () => {
    expect(isRocketstyleComponent('component.readOnly(true)')).toBe(true)
  })

  it('should not match plain React components', () => {
    expect(isRocketstyleComponent('const Badge = () => <div />')).toBe(false)
  })
})

describe('isReactComponent', () => {
  it('should detect FC pattern', () => {
    expect(
      isReactComponent('export default const Badge: FC = () => <div />'),
    ).toBe(true)
  })

  it('should detect forwardRef pattern', () => {
    expect(
      isReactComponent('export default forwardRef((props, ref) => <div />)'),
    ).toBe(true)
  })

  it('should detect function component', () => {
    expect(
      isReactComponent('export default function Badge() { return <div /> }'),
    ).toBe(true)
  })

  it('should detect rocketstyle component as React component', () => {
    expect(
      isReactComponent(
        'export default component.config({ name: "Badge" }).theme(t)',
      ),
    ).toBe(true)
  })

  it('should not match non-component files', () => {
    expect(isReactComponent('export const utils = {}')).toBe(false)
  })
})

describe('extractNamedExports', () => {
  it('should extract named const exports', () => {
    const code = `
      export const Default = stories.main()
      export const States = stories.dimension('state')
      export const Sizes = stories.dimension('size')
    `
    expect(extractNamedExports(code)).toEqual(['Default', 'States', 'Sizes'])
  })

  it('should return empty array for no exports', () => {
    expect(extractNamedExports('const x = 1')).toEqual([])
  })

  it('should not extract default exports', () => {
    const code = `
      export default stories.init()
      export const Default = stories.main()
    `
    expect(extractNamedExports(code)).toEqual(['Default'])
  })
})

describe('extractExplicitTitle', () => {
  it('should extract title from .config({ name: "..." })', () => {
    expect(extractExplicitTitle(`.config({ name: 'Custom/Title' })`)).toBe(
      'Custom/Title',
    )
  })

  it('should extract title with double quotes', () => {
    expect(extractExplicitTitle('.config({ name: "My/Component" })')).toBe(
      'My/Component',
    )
  })

  it('should return null when no explicit title', () => {
    expect(extractExplicitTitle('export default stories.init()')).toBeNull()
  })
})

describe('extractComponentName', () => {
  it('should extract default import name', () => {
    expect(extractComponentName("import Badge from '..'")).toBe('Badge')
  })

  it('should extract named import', () => {
    expect(extractComponentName("import { Card } from '..'")).toBe('Card')
  })

  it('should return null for no matching import', () => {
    expect(
      extractComponentName("import Badge from '@vitus-labs/ui-base'"),
    ).toBeNull()
  })
})

describe('deriveTitle', () => {
  it('should derive title from component index file', () => {
    expect(deriveTitle('/project/packages/ui-base/src/Badge/index.tsx')).toBe(
      'ui-base/Badge',
    )
  })

  it('should derive title without package prefix', () => {
    expect(deriveTitle('/project/src/Button/index.tsx')).toBe('Button')
  })

  it('should derive title from story file matching parent dir', () => {
    expect(
      deriveTitle(
        '/project/packages/ui-base/src/Badge/__stories__/Badge.stories.tsx',
        { isStoryFile: true },
      ),
    ).toBe('ui-base/Badge')
  })

  it('should derive sub-story title when story name differs from parent', () => {
    expect(
      deriveTitle(
        '/project/packages/ui-base/src/Badge/__stories__/Composite.stories.tsx',
        { isStoryFile: true },
      ),
    ).toBe('ui-base/Badge/Composite')
  })

  it('should derive title from root story file', () => {
    expect(
      deriveTitle(
        '/project/packages/ui-core/src/__stories__/Element.stories.tsx',
        { isStoryFile: true },
      ),
    ).toBe('ui-core/Element')
  })

  it('should derive title without package prefix for story files', () => {
    expect(
      deriveTitle('/project/src/Button/__stories__/Button.stories.tsx', {
        isStoryFile: true,
      }),
    ).toBe('Button')
  })

  it('should fall back to filename', () => {
    expect(deriveTitle('/project/src/helpers.ts')).toBe('helpers')
  })

  it('should handle Windows paths', () => {
    expect(
      deriveTitle('\\project\\packages\\ui-base\\src\\Badge\\index.tsx'),
    ).toBe('ui-base/Badge')
  })
})

describe('detectComponentKind', () => {
  it('should detect rocketstyle components', () => {
    expect(
      detectComponentKind('component.config({ name: "Badge" }).theme(t)'),
    ).toBe('rocketstyle')
  })

  it('should detect plain React components', () => {
    expect(
      detectComponentKind('export default const Badge: FC = () => <div />'),
    ).toBe('react')
  })

  it('should return unknown for non-component files', () => {
    expect(detectComponentKind('export const utils = {}')).toBe('unknown')
  })

  it('should prefer rocketstyle over plain react', () => {
    expect(
      detectComponentKind('export default component.config({ name: "Badge" })'),
    ).toBe('rocketstyle')
  })
})

describe('extractDimensionNames', () => {
  it('should extract states dimension', () => {
    expect(extractDimensionNames('component.states({ active: true })')).toEqual(
      ['state'],
    )
  })

  it('should extract multiple dimensions', () => {
    const code = `
      component
        .states({ active: true })
        .sizes({ sm: {}, md: {}, lg: {} })
        .variants({ primary: {}, secondary: {} })
    `
    expect(extractDimensionNames(code)).toEqual(['state', 'size', 'variant'])
  })

  it('should extract multiple() dimension', () => {
    expect(
      extractDimensionNames('component.multiple({ a: {}, b: {} })'),
    ).toEqual(['multiple'])
  })

  it('should not duplicate dimensions', () => {
    const code = `
      component.states({ a: true }).states({ b: true })
    `
    expect(extractDimensionNames(code)).toEqual(['state'])
  })

  it('should not extract readOnly as a dimension', () => {
    const code = `
      component.states({ active: true }).readOnly(true)
    `
    expect(extractDimensionNames(code)).toEqual(['state'])
  })

  it('should return empty for no dimensions', () => {
    expect(
      extractDimensionNames('component.config({ name: "Badge" })'),
    ).toEqual([])
  })
})
