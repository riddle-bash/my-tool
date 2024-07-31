import { xlsx } from 'https://deno.land/x/flat@0.0.15/src/xlsx.ts'

// Input and output files
const JSONDATA = './out/collocations.json'
const excelFileName = 'exported_data_ozdic.xlsx'

// Define the collocation mapping rules based on cleaned POS
const posCollocationMapping = {
  adj: {
    ADV: 'ADV+',
    VERB: 'VERB+',
  },
  verb: {
    ADV: '+ADV',
  },
  'noun VERB': {
    VERB: 'VERB+',
  },
}

// Function to clean POS by removing periods and commas
const cleanPOS = (pos) => (pos ? pos.replace(/[.,]/g, '').trim() : '')

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

    // Determine the new collocation type based on the cleaned POS rules
    const newCollocationType =
      posCollocationMapping[cleanedPOS]?.[collocationType] || collocationType

    // Initialize if not already present
    if (!collocations[newCollocationType]) {
      collocations[newCollocationType] = ''
    }

    // Append words to corresponding type
    collocations[newCollocationType] +=
      (collocations[newCollocationType] ? ', ' : '') + words
    columns.add(newCollocationType)
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
