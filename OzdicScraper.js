import { log } from './deps.ts'
import { DOMParser } from 'https://esm.sh/linkedom'
import { sleepRandomAmountOfSeconds } from 'https://deno.land/x/sleep/mod.ts'

const WORDS_FILE = './in/azvocab_dict_no_whitespace_07_24.txt'
const OUTPUT_FILE = './out/collocations.json'

/**
 * Init logger
 */
await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler('DEBUG'),
    file: new log.handlers.FileHandler('INFO', {
      filename: `./scraper.log`,
      formatter: (logRecord) => {
        const options = {
          year: '2-digit',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Ho_Chi_Minh',
        }

        const fmt = new Intl.DateTimeFormat('vi-VN', options)
        let msg = `${fmt.format(logRecord.datetime)} ${logRecord.levelName} ${
          logRecord.msg
        }`

        logRecord.args.forEach((arg, index) => {
          msg += `, arg${index}: ${arg}`
        })

        return msg
      },
    }),
  },

  loggers: {
    default: {
      level: 'DEBUG',
      handlers: ['console', 'file'],
    },
  },
})

const logger = log.getLogger()

async function readWords(file) {
  const words = new Set()
  try {
    const texts = await Deno.readTextFile(file)
    const lines = texts.split('\n').map((txt) => txt.trim())
    lines.forEach((line) => {
      if (line.length > 0) {
        words.add(line)
      }
    })
    logger.info(`Loaded ${words.size} words from ${file}`)
  } catch (error) {
    logger.warning(`Failed to read words from ${file}: ${error}`)
  }
  return [...words]
}

async function lookup(words, outputFile) {
  const baseUrl = 'https://ozdic.com/collocation/'
  const parser = new DOMParser()
  const results = []

  const validCollocationTypes = [
    'VERB+',
    '+VERB',
    'ADJ+',
    '+ADJ',
    'NOUN+',
    '+NOUN',
    'ADV+',
    '+ADV',
    'PREP',
    'VERB',
    'ADJ',
    'NOUN',
    'ADV',
    'PHRASAL VERB',
    'IDIOM',
    'QUANT',
    // Add other valid collocation types here
  ]

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const url = `${baseUrl}${word}.txt`
    console.info(`Fetching collocations for word: ${word} from ${url}`)

    try {
      const response = await fetch(url)
      const html = await response.text()
      const document = parser.parseFromString(html, 'text/html')

      const collocationsByMeaning = {}
      let currentMeaning = ''
      let pos = ''

      document.querySelectorAll('DIV.item').forEach((item) => {
        item.querySelectorAll('P').forEach((p, index) => {
          const bElements = p.querySelectorAll('B')
          const iElement = p.querySelector('I')
          const uElement = p.querySelector('U')
          const ttElement = p.querySelector('TT')

          if (ttElement) {
            currentMeaning = ttElement.textContent.trim()
            if (!collocationsByMeaning[currentMeaning]) {
              collocationsByMeaning[currentMeaning] = []
            }
          }
          if (iElement && index === 0) {
            pos = iElement.textContent.trim()
          }
          if (uElement) {
            let collocationType = uElement.textContent.trim().toUpperCase()
            const example = (iElement?.textContent || '').trim()

            // Combine text from all <B> elements
            let words = Array.from(bElements)
              .map((b) => b.textContent.trim())
              .join(' ')
              .trim()

            // Remove example from words if it is included
            if (example) {
              const exampleIndex = words.indexOf(example)
              if (exampleIndex !== -1) {
                words = words.substring(0, exampleIndex).trim()
              }
            }

            // Split words by '|' and trim extra spaces
            words = words
              .split('|')
              .map((w) => w.trim())
              .join('; ')

            words = words
              .split(',')
              .map((w) => w.trim())
              .join('; ')

            collocationType = collocationType.replace(/\s+/g, '')

            // Extract valid collocation type
            let extractedType = ''
            for (const type of validCollocationTypes) {
              if (collocationType.includes(type)) {
                extractedType = type
                break
              }
            }

            // Check if extractedType is valid
            if (extractedType) {
              // Ensure that currentMeaning is not undefined or empty
              if (collocationsByMeaning[currentMeaning] === undefined) {
                collocationsByMeaning[currentMeaning] = []
              }

              collocationsByMeaning[currentMeaning].push({
                collocation: extractedType,
                words: words,
                example: example || '', // Ensure example is defined
              })
            }
          }
        })
      })

      // Convert collocationsByMeaning to the desired output format
      const collocations = Object.keys(collocationsByMeaning).map(
        (meaning) => ({
          vocab: word,
          pos: pos,
          meaning: meaning || '', // Handle empty meaning
          collocations: collocationsByMeaning[meaning].map((collocation) => ({
            collocation: collocation.collocation,
            words: collocation.words,
          })),
        })
      )

      console.info(
        `Extracted ${collocations.length} meanings with collocations for word: ${word}`
      )
      results.push(...collocations)
    } catch (error) {
      console.warn(`Failed to fetch collocations for word: ${word}: ${error}`)
      results.push({ vocab: word, pos: null, meaning: '', collocations: [] })
    }

    if (i % 10 === 0) {
      console.info(`Processed ${i + 1} words, sleeping for a while...`)
      await sleepRandomAmountOfSeconds(1, 3)
    }
  }

  try {
    await Deno.writeTextFile(outputFile, JSON.stringify(results, null, 2))
    console.info(`Successfully wrote collocations to ${outputFile}`)
  } catch (error) {
    console.warn(`Failed to write collocations to file: ${error}`)
  }
}

async function main() {
  const words = await readWords(WORDS_FILE)
  logger.info(`Starting lookup for ${words.length} words`)
  await lookup(words, OUTPUT_FILE)
  logger.info('DONE!')
}

main()
