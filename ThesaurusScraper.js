// Import required Deno modules
import { DOMParser } from 'https://esm.sh/linkedom'

const WORDS_FILE = './in/azvocab_word_no_whitespace_16_10_24.txt'
// const WORDS_FILE = './in/test.txt'

async function readWords(file) {
  try {
    const texts = await Deno.readTextFile(file)
    const words = new Set(
      texts
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    )
    return [...words]
  } catch (error) {
    console.error(`Failed to read words from ${WORDS_FILE}:`, error)
    return []
  }
}

// Function to fetch and parse the HTML page
async function fetchPage(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.text()
  } catch (error) {
    console.error(`Error fetching ${url}:`, error)
    return null
  }
}

// Function to extract synonyms, antonyms, and other details
function parsePage(html, word) {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')
  if (!document) return []

  const results = []

  // Select all entries
  const level1_entries = document.querySelectorAll(
    '.entry-word-section-container'
  )
  level1_entries.forEach((level1) => {
    const posElement = level1.querySelector('.parts-of-speech a')
    const level2_entries = level1.querySelectorAll('.vg-sseq-entry-item')

    level2_entries.forEach((level2) => {
      const vocab = word
      const pos = posElement ? posElement.textContent.trim() : ''
      const asIn =
        level2.querySelector('.as-in-word em')?.textContent.trim() || ''
      const meaningElement = level2.querySelector('.dt')
      const meaning = meaningElement
        ? meaningElement.textContent
            .trim()
            .replace(/\s+/g, ' ')
            .split(
              level2.querySelector('.sub-content-thread')?.textContent.trim() ||
                ''
            )[0]
            ?.trim() || ''
        : ''
      const example =
        meaningElement
          ?.querySelector('.sub-content-thread')
          ?.textContent.trim()
          .replace(/\s+/g, ' ') || ''

      const syns = extractWords(level2, '.thes-list.sim-list-scored .syl')
      const ants = extractWords(level2, '.thes-list.opp-list-scored .syl')

      results.push({
        vocab,
        pos,
        as_in: asIn,
        meaning,
        example,
        ...mapSynonymsAndAntonyms(syns, 'syn'),
        ...mapSynonymsAndAntonyms(ants, 'ant'),
      })
    })
  })

  return results
}

// Helper function to extract synonyms or antonyms
function extractWords(entry, selector) {
  const elements = entry.querySelectorAll(selector)
  return Array.from(elements).reduce((acc, word) => {
    const lozenge = word.closest('.lozenge')
    const className = lozenge?.className || ''
    const color = className.split(' ')[1] || ''
    const text = word.textContent.trim()
    acc[color] = acc[color] ? [...acc[color], text] : [text]
    return acc
  }, {})
}

// Helper function to map synonyms and antonyms
function mapSynonymsAndAntonyms(words, prefix) {
  return Object.keys(words).reduce((acc, color) => {
    acc[`${prefix}_${color.charAt(color.length - 1)}`] =
      words[color].join('; ') || ''
    return acc
  }, {})
}

// Main function to perform scraping
async function scrapeThesaurus() {
  const results = []
  const origin = await readWords(WORDS_FILE)

  const words = origin.slice(35001, 40000)

  console.log(`Reading ${words.length} from ${WORDS_FILE}`)

  for (const word of words) {
    const url = `https://www.merriam-webster.com/thesaurus/${word}`
    console.log(`Fetching: ${url}`)
    const html = await fetchPage(url)
    if (html) {
      const data = parsePage(html, word)
      results.push(...data)
    }
  }

  // Write results to JSON file
  await Deno.writeTextFile(OUTPUT_FILE, JSON.stringify(results, null, 2))
  console.log(`Scraping complete. Results saved to ${OUTPUT_FILE}`)
}

// Run the scraper
scrapeThesaurus()
