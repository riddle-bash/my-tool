// Import necessary modules
// import {
//   readTextFile,
//   writeTextFile,
// } from 'https://deno.land/std@0.203.0/fs/mod.ts'
import {
  join,
  extname,
  basename,
  dirname,
} from 'https://deno.land/std@0.224.0/path/mod.ts'
import { existsSync } from 'https://deno.land/std/fs/mod.ts'
import { walk } from 'https://deno.land/std@0.224.0/fs/walk.ts'
import { createHmac } from 'node:crypto'

const secretKey = 'azVocab@localization@2024' // Use a securely stored secret key

const PROMPT = `
Please act as a native <native> speaker and localize the following labels into <language>. Ensure the translations are accurate and contextually appropriate, using professional phrasing suitable for production applications.

Guidelines:
Do not translate variables or URL values. Exclude Pinyin, romanizations, comments, explanations, and transliterations.
Replace only the English text values while preserving the exact JSON key-value structure from the input.
Ensure the output is in valid JSON format, ready for programmatic extraction, with no comments or extra content.
Each translation must accurately convey the original meaning and meet professional standards.

Input:
<input>

Expected Output:

{
  // The structure from the input JSON remains the same.
  // Replace only the English text values with accurate <language> translations.
}

`

const LOCALE_MAP = {
  ar: { native: 'Arabic', language: 'Arabic' },
  bn: { native: 'Bengali', language: 'Bengali' },
  cs: { native: 'Czech', language: 'Czech' },
  de: { native: 'German', language: 'German' },
  el: { native: 'Greek', language: 'Greek' },
  //en: { native: 'English', language: 'English' },
  es: { native: 'Spanish', language: 'Spanish' },
  fr: { native: 'French', language: 'French' },
  hi: { native: 'Hindi', language: 'Hindi' },
  hu: { native: 'Hungarian', language: 'Hungarian' },
  id: { native: 'Indonesian', language: 'Indonesian' },
  it: { native: 'Italian', language: 'Italian' },
  ja: { native: 'Japanese', language: 'Japanese' },
  ko: { native: 'Korean', language: 'Korean' },
  nl: { native: 'Dutch', language: 'Dutch' },
  pl: { native: 'Polish', language: 'Polish' },
  pt: { native: 'Portuguese', language: 'Portuguese' },
  ro: { native: 'Romanian', language: 'Romanian' },
  ru: { native: 'Russian', language: 'Russian' },
  sv: { native: 'Swedish', language: 'Swedish' },
  te: { native: 'Telugu', language: 'Telugu' },
  th: { native: 'Thai', language: 'Thai' },
  tl: { native: 'Filipino', language: 'Filipino' },
  tr: { native: 'Turkish', language: 'Turkish' },
  uk: { native: 'Ukrainian', language: 'Ukrainian' },
  ur: { native: 'Urdu-speaking', language: 'Urdu' },
  //vi: { native: 'Vietnamese', language: 'Vietnamese' },
  zh: { native: 'Chinese', language: 'Simplified Chinese' },
}

/**
 * Utility function to extract data from json notation
 * @param {*} str
 * @returns
 */
const extractJson = (text) => {
  const str = text.trim()

  let firstOpen = str.indexOf('{')
  let firstClose
  let candidate

  while (firstOpen !== -1) {
    firstClose = str.lastIndexOf('}')
    if (firstClose <= firstOpen) {
      console.error('firstClose <= firstOpen. Not found json result:', str)
      return null
    }

    while (firstClose > firstOpen) {
      candidate = str.substring(firstOpen, firstClose + 1)
      try {
        let res = JSON.parse(candidate)
        let trimedJson = candidate
          .trim()
          .substr(1, candidate.length - 1)
          .trim()

        if (trimedJson.endsWith('}')) {
          trimedJson = trimedJson.substring(0, trimedJson.length - 1)
        }

        return trimedJson
      } catch (e) {
        console.log('Parse json error:', candidate)
        firstClose = str.substr(0, firstClose).lastIndexOf('}')
      }
    }
    firstOpen = str.indexOf('{', firstOpen + 1)
  }

  console.error('Not found json result:', str)
  return null
}

/**
 * Utility function to scan public/locales diretory to construct source file path and destination file path base on locale
 *
 * @param {*} sourceDir
 * @param {*} locale
 * @param {*} destinationDir
 * @returns
 */
const scanDir = async (sourceDir, locale, destinationDir) => {
  const isWeb = MODE.indexOf('WEB') > -1 ? true : false
  const isMobile = MODE.indexOf('MOBILE') > -1 ? true : false

  const enDir = join(sourceDir, isWeb ? 'en' : '') // Define the 'en' subfolder path
  const result = []

  for await (const entry of walk(enDir, { includeDirs: false })) {
    if (extname(entry.path) === '.json') {
      // Check if the file ends with .json
      const fileName = basename(entry.path) // Extract only the file name

      const destinationFilePath = isWeb
        ? join(destinationDir, locale, fileName)
        : join(destinationDir, `${locale}.json`) // Construct destination path

      if (isMobile) {
        if (fileName === 'en.json') {
          result.push({
            sourceFilePath: entry.path,
            destinationFilePath,
          })
        }
      } else {
        result.push({
          sourceFilePath: entry.path,
          destinationFilePath,
        })
      }
    }
  }

  return result
}

/**
 * Utility function to read source file, call api to translate and save to destination file
 *
 * @param {*} sourceFilePath
 * @param {*} destinationFilePath
 * @param {*} locale
 */
const translateAndSave = async (
  sourceFilePath,
  destinationFilePath,
  locale
) => {
  const isAdd = MODE.indexOf('ADD') > -1 ? true : false

  const apiEndpoint = 'https://dev.azvocab.ai/api/internal/localize'
  const maxBatchSize = 2000 // Maximum characters per batch

  // Step 1: Read the source file
  const fileContent = await Deno.readTextFile(sourceFilePath)
  const content = fileContent
    .trim()
    .split('\n')
    .map((line) => line.trim())

  const allLines = content.slice(1, content.length - 1)

  let lines = []

  if (isAdd) {
    //Find the last block separate by at least two empty line
    let idx = -1
    for (let i = allLines.length - 1; i > 0; i--) {
      if (allLines[i].length === 0 && allLines[i + 1]?.length > 0) {
        idx = i + 1
        break
      }
    }

    if (idx > -1 && idx < allLines.length) {
      lines = allLines.slice(idx).filter((line) => line.length > 0)
    }
  } else {
    lines = allLines.filter((line) => line.length > 0)
  }

  // Step 2: Prepare batches based on maxBatchSize
  let currentBatch = []
  let currentBatchSize = 0
  const batches = []

  lines.forEach((line) => {
    const lineLength = line.length

    if (currentBatchSize + lineLength > maxBatchSize) {
      // Push the current batch to batches and reset
      batches.push(currentBatch.join('\n'))
      currentBatch = []
      currentBatchSize = 0
    }

    currentBatch.push(line)
    currentBatchSize += lineLength
  })

  if (currentBatch.length > 0) {
    batches.push(currentBatch.join('\n')) // Add the last batch
  }

  // Step 3: Translate each batch and store results
  const translatedLines = []

  for (const text of batches) {
    const paramInfo = LOCALE_MAP[locale]

    if (!paramInfo) {
      console.error(`Parameter information not found for locale: ${locale}`)
      return
    }

    let batch = text.trim()

    if (batch.length <= 3) {
      continue
    }

    if (batch.endsWith(',')) {
      batch = batch.substring(0, batch.length - 1)
    }

    const prompt = PROMPT.replaceAll('<language>', paramInfo.language)
      .replaceAll('<native>', paramInfo.native)
      .replace('<input>', batch)

    const timestamp = Date.now() // Current timestamp in milliseconds
    const payload = JSON.stringify({ prompt, timestamp })

    const hmac = createHmac('sha256', secretKey)
    hmac.update(payload)
    const checksum = hmac.digest('hex')

    let tried = 3

    while (tried > 0) {
      try {
        const response = TEST
          ? await dummyApi(batch)
          : await fetch(apiEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: checksum,
              },
              body: payload,
            })

        let result = null

        if (!response.ok) {
          console.error(`Failed to translate batch: ${response.statusText}`)
        } else {
          const { translatedText } = await response.json()
          result = extractJson(translatedText)

          console.log('--------------->', batch.length)
          console.log(result)
          console.log('<---------------')
        }

        if (result) {
          translatedLines.push(
            ...result
              .split('\n')
              .filter((line) => line.trim().length > 0)
              .map((line) => {
                const tmp = line.trim()
                if (tmp.endsWith(',')) {
                  return `  ${tmp}`
                } else {
                  return `  ${tmp},`
                }
              })
          )

          break
        } else {
          tried = tried - 1
          console.warn('Translate error, retry...')
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (err) {
        tried = tried - 1
        console.warn('Translate error, retry...')
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    if (tried === 0) {
      throw new Error('Translate maximum retried error!')
    }

    await new Promise((resolve) => setTimeout(resolve, TEST ? 0 : 2000))
  }

  // Step 4: Save the translated content to the destination file
  if (translatedLines.length > 0) {
    const resultContent = translatedLines.join('\n').replace(/,$/, '') // Remove trailing comma

    if (existsSync(destinationFilePath)) {
      // Read the existing file
      const existingContent = await Deno.readTextFile(destinationFilePath)

      // Append the new content before the closing bracket
      const updatedContent = existingContent.replace(
        /\}\s*$/,
        `,\n${resultContent}\n}`
      )

      // Write the updated content back to the file
      await Deno.writeTextFile(destinationFilePath, updatedContent)
      console.log(`Content appended to ${destinationFilePath}`)
    } else {
      // Ensure the parent directory exists
      const parentDir = dirname(destinationFilePath)
      await Deno.mkdir(parentDir, { recursive: true })

      await Deno.writeTextFile(destinationFilePath, `{\n${resultContent}\n}`)
      console.log(`Translated content saved to ${destinationFilePath}`)
    }
  }
}

/**
 * Main function
 */

//MODE: INIT_WEB, INIT_MOBILE, ADD_WEB, ADD_MOBILE
const MODE = 'ADD_WEB' // localize some addition label
const TEST = false

// Dummy API function
const dummyApi = async (input) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const translatedText = `\`\`\`json\n{\n${input}\n}\n\`\`\``

      resolve({
        ok: true,
        json: async () => ({ translatedText }),
      })
    }, 0) // Simulate a delay for testing
  })
}

const main = async () => {
  let sourceDir = ''
  let destDir = ''

  if (MODE.indexOf('WEB') > -1) {
    sourceDir = 'C:\\Users\\thangqm\\My Workspace\\azVocab\\public\\locales'
    destDir = sourceDir

    // if (MODE.indexOf('ADD') > -1) {
    //   destDir = 'C:\\Users\\thangqm\\Downloads\\locales\\WEB\\ADD'
    // } else {
    //   destDir = 'C:\\Users\\thangqm\\Downloads\\locales\\WEB\\INIT'
    // }
  } else {
    sourceDir = 'C:\\Users\\thangqm\\My Workspace\\mobileapp\\azvocab\\locales'
    destDir = sourceDir

    // if (MODE.indexOf('ADD') > -1) {
    //   destDir = 'C:\\Users\\thangqm\\Downloads\\locales\\MOBILE\\ADD'
    // } else {
    //   destDir = 'C:\\Users\\thangqm\\Downloads\\locales\\MOBILE\\INIT'
    // }
  }

  const locales = Object.keys(LOCALE_MAP)

  for (let i = 0; i < locales.length; i++) {
    const locale = locales[i]

    const files = await scanDir(sourceDir, locale, destDir)

    for (let i = 0; i < files.length; i++) {
      const { sourceFilePath, destinationFilePath } = files[i]

      console.log(`Processing ${sourceFilePath} -> ${destinationFilePath}`)

      await translateAndSave(sourceFilePath, destinationFilePath, locale)

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}

await main()

/**
 * Command:
 * deno run --allow-read --allow-write --allow-net localize.js
 */
