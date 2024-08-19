import { xlsx } from 'https://deno.land/x/flat@0.0.15/src/xlsx.ts'

// Input files
const JSONDATA = './out/collocations.json'
const POSDATA = './Lemmas_Export_2024_08_13_08_57.xlsx' // Absolute path to POSDATA
const excelFileName = 'exported_data_ozdic.xlsx'

// Function to clean POS by removing periods and commas
const cleanPOS = (pos) => (pos ? pos.replace(/[.,]/g, '').trim() : '')

// Function to preprocess and clean words, keeping ~ for prep+ and +prep
const preprocessWords = (words) => {
  return words
    .replace(/\(.*?\)/g, '') // Remove parentheses and content within them
    .replace(/\s+$/, '') // Remove trailing spaces
    .replace(/~s/g, '~;') // Replace '~s' with '~;'
    .trim()
}

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

// Function to check if a word is an adjective
const hasAdjectivePOS = (word) => posDict[word.toLowerCase()]?.has('adj')
const hasNounPOS = (word) => posDict[word.toLowerCase()]?.has('n')

// Function to separate and process PREP collocations
const processPrepCollocations = (words) => {
  const prepPlus = []
  const plusPrep = []

  words.split(';').forEach((word) => {
    const trimmedWord = word.trim()
    if (trimmedWord.startsWith('~')) {
      plusPrep.push(trimmedWord.replace('~', '').trim())
    } else if (trimmedWord.endsWith('~')) {
      prepPlus.push(trimmedWord.replace('~', '').trim())
    } else {
      // Default to plusPrep for ambiguous cases
      plusPrep.push(trimmedWord)
    }
  })

  return { prepPlus, plusPrep }
}

// Read and parse JSON data
const parsedData = await Deno.readTextFile(JSONDATA)
const dataJson = JSON.parse(parsedData)

// Prepare data for the Excel sheet
const columns = new Set()
const rows = []

dataJson.forEach((entry) => {
  const vocab = entry.vocab
  const pos = entry.pos ? entry.pos.replace(/[.,]/g, '').trim() : ''
  const meaning = entry.meaning

  // Clean POS, handle null values
  const cleanedPOS = cleanPOS(pos)

  // Collect collocations and their types
  const collocations = {}
  entry.collocations.forEach((coll) => {
    const { collocation, words } = coll
    const collocationType = collocation.trim()
    const cleanedWords = preprocessWords(words)

    if (collocationType.toLowerCase() === 'prep') {
      const { prepPlus, plusPrep } = processPrepCollocations(cleanedWords)

      if (prepPlus.length > 0) {
        const prepPlusColumn = 'PREP+'
        if (!collocations[prepPlusColumn]) {
          collocations[prepPlusColumn] = ''
        }
        collocations[prepPlusColumn] +=
          (collocations[prepPlusColumn] ? '; ' : '') +
          prepPlus.filter((i) => i !== '').join('; ')
        columns.add(prepPlusColumn)
      }

      if (plusPrep.length > 0) {
        const plusPrepColumn = '+PREP'
        if (!collocations[plusPrepColumn]) {
          collocations[plusPrepColumn] = ''
        }
        collocations[plusPrepColumn] +=
          (collocations[plusPrepColumn] ? '; ' : '') +
          plusPrep.filter((i) => i !== '').join('; ')
        columns.add(plusPrepColumn)
      }
    } else if (collocationType.toLowerCase() === 'adj') {
      const adjWords = []
      const adjNounWords = []

      cleanedWords.split(';').forEach((word) => {
        const trimmedWord = word.trim()
        if (hasAdjectivePOS(trimmedWord)) {
          adjWords.push(trimmedWord)
        } else if (hasNounPOS(trimmedWord)) {
          adjNounWords.push(trimmedWord)
        }
      })

      if (adjWords.length > 0) {
        const adjColumn = 'ADJ'
        if (!collocations[adjColumn]) {
          collocations[adjColumn] = ''
        }
        collocations[adjColumn] +=
          (collocations[adjColumn] ? '; ' : '') + adjWords.join('; ')
        columns.add(adjColumn)
      }

      if (adjNounWords.length > 0) {
        const adjNounColumn = 'ADJ (Noun)'
        if (!collocations[adjNounColumn]) {
          collocations[adjNounColumn] = ''
        }
        collocations[adjNounColumn] +=
          (collocations[adjNounColumn] ? '; ' : '') + adjNounWords.join('; ')
        columns.add(adjNounColumn)
      }
    } else {
      if (!collocations[collocationType]) {
        collocations[collocationType] = ''
      }
      collocations[collocationType] +=
        (collocations[collocationType] ? '; ' : '') + cleanedWords
      columns.add(collocationType)
    }
  })

  // Prepare row with vocab, pos, meaning, and collocations
  const row = [vocab, pos || '', meaning]
  Array.from(columns).forEach((col) => {
    row.push(collocations[col] || '')
  })
  rows.push(row)
})

// Add header row
const header = [
  'Vocabulary',
  'Part of Speech',
  'Meaning',
  ...Array.from(columns),
]
const data = [header, ...rows]

// Create workbook and worksheet
const workbook = xlsx.utils.book_new()
const worksheet = xlsx.utils.aoa_to_sheet(data)
xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

// Write to file
await xlsx.writeFile(workbook, excelFileName)
console.log(`Successfully exported data to ${excelFileName}`)
