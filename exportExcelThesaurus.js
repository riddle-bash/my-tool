import { xlsx } from 'https://deno.land/x/flat@0.0.15/src/xlsx.ts'

// Input files
const JSONDATA = './out/thesaurus_results.json'
const WORDDATA = './in/azvocab_word_no_whitespace_16_10_24.txt'
const OUTPUT = 'exported_thesaurus_data'

async function readWords(file) {
  try {
    const texts = await Deno.readTextFile(file)
    const words = new Set(
      texts
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    )
    console.log(`Reading ${words.size} from ${WORDDATA}`)
    return [...words]
  } catch (error) {
    console.error(`Failed to read words from ${WORDDATA}:`, error)
    return []
  }
}

const rows = []

// Read and parse JSON data
const parsedData = await Deno.readTextFile(JSONDATA)
const dataJson = JSON.parse(parsedData)

// Read word data
const wordsArray = await readWords(WORDDATA)
const validWords = new Set(wordsArray)

dataJson.forEach((item) => {
  const vocab = item.vocab
  const pos = item.pos
  const as_in = item.as_in
  const meaning = item.meaning

  const syn_4 = []
  const syn_4_1 = []
  const syn_3 = []
  const syn_3_1 = []
  const syn_2 = []
  const syn_2_1 = []
  const syn_1 = []
  const syn_1_1 = []

  const ant_4 = []
  const ant_4_1 = []
  const ant_3 = []
  const ant_3_1 = []
  const ant_2 = []
  const ant_2_1 = []
  const ant_1 = []
  const ant_1_1 = []

  item.syn_4
    ?.split(';')
    ?.forEach((syn) =>
      validWords.has(syn) ? syn_4.push(syn) : syn_4_1.push(syn)
    )

  item.syn_3
    ?.split(';')
    ?.forEach((syn) =>
      validWords.has(syn) ? syn_3.push(syn) : syn_3_1.push(syn)
    )

  item.syn_2
    ?.split(';')
    ?.forEach((syn) =>
      validWords.has(syn) ? syn_2.push(syn) : syn_2_1.push(syn)
    )

  item.syn_1
    ?.split(';')
    ?.forEach((syn) =>
      validWords.has(syn) ? syn_1.push(syn) : syn_1_1.push(syn)
    )

  item.ant_4
    ?.split(';')
    ?.forEach((ant) =>
      validWords.has(ant) ? ant_4.push(ant) : ant_4_1.push(ant)
    )

  item.ant_3
    ?.split(';')
    ?.forEach((ant) =>
      validWords.has(ant) ? ant_3.push(ant) : ant_3_1.push(ant)
    )

  item.ant_2
    ?.split(';')
    ?.forEach((ant) =>
      validWords.has(ant) ? ant_2.push(ant) : ant_2_1.push(ant)
    )

  item.ant_1
    ?.split(';')
    ?.forEach((ant) =>
      validWords.has(ant) ? ant_1.push(ant) : ant_1_1.push(ant)
    )
  const row = [
    vocab,
    pos,
    as_in,
    meaning,
    syn_4.join('; '), // Valid synonyms from syn_4
    syn_4_1.join('; '), // Invalid synonyms from syn_4_1
    syn_3.join('; '), // Valid synonyms from syn_3
    syn_3_1.join('; '), // Invalid synonyms from syn_3_1
    syn_2.join('; '), // Valid synonyms from syn_2
    syn_2_1.join('; '), // Invalid synonyms from syn_2_1
    syn_1.join('; '), // Valid synonyms from syn_1
    syn_1_1.join('; '), // Invalid synonyms from syn_1_1
    ant_4.join('; '), // Valid antonyms from ant_4
    ant_4_1.join('; '), // Invalid antonyms from ant_4_1
    ant_3.join('; '), // Valid antonyms from ant_3
    ant_3_1.join('; '), // Invalid antonyms from ant_3_1
    ant_2.join('; '), // Valid antonyms from ant_2
    ant_2_1.join('; '), // Invalid antonyms from ant_2_1
    ant_1.join('; '), // Valid antonyms from ant_1
    ant_1_1.join('; '), // Invalid antonyms from ant_1_1
  ]
  rows.push(row)
})

// Add header row
const header = [
  'Vocabulary',
  'Part of Speech',
  'As in',
  'Meaning',
  'Strongest Synonyms',
  'Non-Existing Strongest Synonyms',
  'Strong Synonyms',
  'Non-Existing Strong Synonyms',
  'Moderate Synonyms',
  'Non-Existing Moderate Synonyms',
  'Weak Synonyms',
  'Non-Existing Weak Synonyms',
  'Strongest Antonyms',
  'Non-Existing Strongest Antonyms',
  'Strong Antonyms',
  'Non-Existing Strong Antonyms',
  'Moderate Antonyms',
  'Non-Existing Moderate Antonyms',
  'Weak Antonyms',
  'Non-Existing Weak Antonyms',
]
const data = [header, ...rows]

// Create workbook and worksheet
const workbook = xlsx.utils.book_new()
const worksheet = xlsx.utils.aoa_to_sheet(data)
xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

const date = new Date()
const timeString = date.getHours() + date.getMinutes() + date.getSeconds()
// Write to file
await xlsx.writeFile(workbook, `exported_thesaurus_data${timeString}.xlsx`)
console.log(`Successfully exported data to ${OUTPUT}`)
