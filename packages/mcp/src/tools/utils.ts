import { writeFileSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { z } from 'zod'

/**
 * Write a file only if it does not exist yet. Returns `true` when written,
 * `false` when an existing file was left untouched. Other errors propagate.
 */
const writeIfMissing = (filePath: string, content: string): boolean => {
  try {
    writeFileSync(filePath, content, { flag: 'wx' })
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false
    throw error
  }
}

const absolutePath = (description: string) =>
  z
    .string()
    .refine((value) => isAbsolute(value), {
      message: 'directory must be an absolute path',
    })
    .describe(description)

const errorResult = (text: string) => ({
  isError: true as const,
  content: [{ type: 'text' as const, text }],
})

export { absolutePath, errorResult, writeIfMissing }
