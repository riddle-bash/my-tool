import { xlsx } from 'https://deno.land/x/flat@0.0.15/src/xlsx.ts'

// Input files
const JSONDATA = './out/thesaurus_results.json'
const POSDATA = './Lemmas_Export_2024_08_13_08_57.xlsx'
const OUTPUT = 'exported_thesaurus_data'

const POS_MAP = {
  noun: 'n',
  verb: 'v',
  adjective: 'adj',
  adverb: 'adv',
  preposition: 'prep',
  pronoun: 'pron',
  phrase: 'phr',
  'phrasal verb': 'phr.v',
  'auxiliary verb': 'aux',
  proverb: 'provb',
  'modal verb': 'modal verb',
  idiom: 'idm',
  exclamation: 'excl',
  determiner: 'det',
  conjunction: 'conj',
  title: 'titl',
  prefix: 'prefix',
  suffix: 'suffix',
  number: 'num',
  undefined: '-',
}

const rows = []

// Function to clean POS by removing periods and commas
const cleanPOS = (pos) =>
  pos
    ? pos
        .replace(/[.,]/g, '')
        .replace(/\(\d+\)/g, '')
        .trim()
    : ''

// Read and parse POS data from Excel file
const posWorkbook = xlsx.readFile(POSDATA)
const posSheet = posWorkbook.Sheets[posWorkbook.SheetNames[0]]
const posData = xlsx.utils.sheet_to_json(posSheet, { header: 1 })

// Convert POS data to a dictionary
const posDict = {}
posData.forEach(([word, pos]) => {
  const lowerWord = word.toLowerCase()
  if (!posDict[lowerWord]) {
    posDict[lowerWord] = new Set() // Initialize as a Set if it doesn't exist
  } else if (!(posDict[lowerWord] instanceof Set)) {
    // Ensure it is a Set even if it already exists
    posDict[lowerWord] = new Set([posDict[lowerWord]])
  }

  pos.split(',').forEach((p) => {
    posDict[lowerWord].add(cleanPOS(p.toLowerCase()))
  })
})

// Check exist POS function
const hasMatchedPOS = (word, pos) => posDict[word.toLowerCase()]?.has(pos)
const isPastTense = (word, pos) => pos === 'v' && word.slice(-2) === 'ed'

// Read and parse JSON data
const parsedData = await Deno.readTextFile(JSONDATA)
const dataJson = JSON.parse(parsedData)
const nonExistMap = new Map()

dataJson.forEach((item, index) => {
  const vocab = item.vocab
  const pos = POS_MAP[cleanPOS(item.pos)] || cleanPOS(item.pos)
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

  item.syn_4?.split('; ')?.forEach(
    (syn) => (hasMatchedPOS(syn, pos) ? syn_4.push(syn) : syn_4_1.push(syn))
    // !hasMatchedPOS(syn, pos) &&
    // !isPastTense(syn, pos) &&
    // !nonExistMap.get(syn) &&
    // nonExistMap.set(syn, pos)
  )

  item.syn_3?.split('; ')?.forEach(
    (syn) => (hasMatchedPOS(syn, pos) ? syn_3.push(syn) : syn_3_1.push(syn))
    // !hasMatchedPOS(syn, pos) &&
    // !isPastTense(syn, pos) &&
    // !nonExistMap.get(syn) &&
    // nonExistMap.set(syn, pos)
  )

  item.syn_2
    ?.split('; ')
    ?.forEach((syn) =>
      hasMatchedPOS(syn, pos) ? syn_2.push(syn) : syn_2_1.push(syn)
    )

  item.syn_1
    ?.split('; ')
    ?.forEach((syn) =>
      hasMatchedPOS(syn, pos) ? syn_1.push(syn) : syn_1_1.push(syn)
    )

  item.ant_4?.split('; ')?.forEach(
    (ant) => (hasMatchedPOS(ant, pos) ? ant_4.push(ant) : ant_4_1.push(ant))
    // !hasMatchedPOS(ant, pos) &&
    // !isPastTense(ant, pos) &&
    // !nonExistMap.get(ant) &&
    // nonExistMap.set(ant, pos)
  )

  item.ant_3?.split('; ')?.forEach(
    (ant) => (hasMatchedPOS(ant, pos) ? ant_3.push(ant) : ant_3_1.push(ant))
    // !hasMatchedPOS(ant, pos) &&
    // !isPastTense(ant, pos) &&
    // !nonExistMap.get(ant) &&
    // nonExistMap.set(ant, pos)
  )

  item.ant_2
    ?.split('; ')
    ?.forEach((ant) =>
      hasMatchedPOS(ant, pos) ? ant_2.push(ant) : ant_2_1.push(ant)
    )

  item.ant_1
    ?.split('; ')
    ?.forEach((ant) =>
      hasMatchedPOS(ant, pos) ? ant_1.push(ant) : ant_1_1.push(ant)
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
// const header = ['Non-existing word', 'Part of Speech']
const data = [header, ...rows]
// const data = [header, ...Array.from(nonExistMap)]

// console.log(Array.from(nonExistMap))

// Create workbook and worksheet
const workbook = xlsx.utils.book_new()
const worksheet = xlsx.utils.aoa_to_sheet(data)
xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

const date = new Date()
const timeString =
  date.getHours() + '_' + date.getMinutes() + '_' + date.getSeconds()
// Write to file
await xlsx.writeFile(workbook, `exported_thesaurus_data_${timeString}.xlsx`)
// await xlsx.writeFile(workbook, `non_exist_thesaurus_word_in_azvocab.xlsx`)
console.log(`Successfully exported data to ${OUTPUT}`)
