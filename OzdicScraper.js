import { log } from './deps.ts'
import { DOMParser } from 'https://esm.sh/linkedom'
import { sleepRandomAmountOfSeconds } from 'https://deno.land/x/sleep/mod.ts'

const WORDS_FILE = './in/test.txt'
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
    'PREP+',
    '+PREP',
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

  const validPOS = [
    'noun',
    'verb',
    'adj',
    'adv',
    'prep',
    // Add other valid POS types here
  ]

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const url = `${baseUrl}${word}.txt`
    console.info(`Fetching collocations for word: ${word} from ${url}`)

    try {
      const response = await fetch(url)
      const html = await response.text()
      const document = parser.parseFromString(html, 'text/html')

      const collocationsByPOS = {}

      document.querySelectorAll('DIV.item').forEach((item) => {
        let currentPOS = ''
        let currentMeaning = ''

        item.querySelectorAll('P').forEach((p, index) => {
          const bElements = p.querySelectorAll('B')
          const iElements = p.querySelectorAll('I')
          const uElement = p.querySelector('U')
          const ttElement = p.querySelector('TT')

          if (ttElement) {
            currentMeaning = ttElement.textContent.trim()
            if (!collocationsByPOS[currentPOS]) {
              collocationsByPOS[currentPOS] = {}
            }
            if (!collocationsByPOS[currentPOS][currentMeaning]) {
              collocationsByPOS[currentPOS][currentMeaning] = []
            }
          }

          // Find the correct POS element
          for (let j = 0; j < iElements.length; j++) {
            const iElementText = iElements[j].textContent
              .trim()
              .toLowerCase()
              .replace(/\./g, '')
            const posArray = iElementText.split(',').map((pos) => pos.trim())
            const validPOSArray = posArray.filter((pos) =>
              validPOS.includes(pos)
            )
            if (validPOSArray.length > 0) {
              currentPOS = validPOSArray[0]
              break
            }
          }

          // Initialize collocationsByPOS for currentPOS if it hasn't been initialized
          if (!collocationsByPOS[currentPOS]) {
            collocationsByPOS[currentPOS] = {}
          }

          if (uElement) {
            let collocationType = uElement.textContent.trim().toUpperCase()
            const example = (iElements[0]?.textContent || '').trim()

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

            // Function to remove parentheses and the text inside them
            function removeParenthesesAndContents(text) {
              return text.replace(/\(.*?\)/g, '').trim()
            }

            // Handle PREP cases with `~` markers
            if (collocationType.includes('PREP')) {
              words = words
                .split('|')
                .map((word) => {
                  word = removeParenthesesAndContents(word) // Remove parentheses and their contents
                  word = word.trim()
                  if (word.startsWith('~s')) {
                    return {
                      collocation: '+PREP',
                      words: word.replace('~s', '').trim() + 's', // Replace and add 's' back
                    }
                  } else if (word.startsWith('~')) {
                    return {
                      collocation: '+PREP',
                      words: word.replace('~', '').trim(),
                    }
                  } else if (word.endsWith('~s')) {
                    return {
                      collocation: 'PREP+',
                      words: word.replace('~s', '').trim() + 's', // Replace and add 's' back
                    }
                  } else if (word.endsWith('~')) {
                    return {
                      collocation: 'PREP+',
                      words: word.replace('~', '').trim(),
                    }
                  }
                  return { collocation: 'PREP', words: word }
                })
                .filter((word) => word.words) // Filter out empty strings
            } else {
              // Process other types normally
              words = words
                .split('|')
                .map((w) => removeParenthesesAndContents(w).trim()) // Remove parentheses and their contents
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

              // Format as an array for consistency
              words = [{ collocation: extractedType, words }]
            }

            // Push processed words into collocations
            words.forEach(({ collocation, words }) => {
              if (collocation && currentPOS) {
                // Ensure that currentPOS and currentMeaning are not undefined or empty
                if (!collocationsByPOS[currentPOS][currentMeaning]) {
                  collocationsByPOS[currentPOS][currentMeaning] = []
                }

                collocationsByPOS[currentPOS][currentMeaning].push({
                  collocation,
                  words,
                  example: example || '', // Ensure example is defined
                })
              }
            })
          }
        })
      })

      // Convert collocationsByPOS to the desired output format
      Object.keys(collocationsByPOS).forEach((pos) => {
        const posMeanings = collocationsByPOS[pos]
        const collocations = Object.keys(posMeanings).map((meaning) => ({
          vocab: word,
          pos: pos,
          meaning: meaning || '', // Handle empty meaning
          collocations: posMeanings[meaning].map((collocation) => ({
            collocation: collocation.collocation,
            words: collocation.words,
          })),
        }))
        results.push(...collocations)
      })

      console.info(`Extracted collocations for word: ${word}`)
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
