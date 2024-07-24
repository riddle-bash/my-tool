import { xlsx } from 'https://deno.land/x/flat@0.0.15/src/xlsx.ts'

// Input and output files
const JSONDATA = './out/collocations.json'
const excelFileName = 'exported_data_ozdic.xlsx'

// Read and parse JSON data
const parsedData = await Deno.readTextFile(JSONDATA)
const dataJson = JSON.parse(parsedData)

// Prepare data for the Excel sheet
const columns = new Set()
const rows = []

dataJson.forEach((entry) => {
  const vocab = entry.vocab
  const pos = entry.pos
  const meaning = entry.meaning

  // Collect collocations and their types
  const collocations = {}
  entry.collocations.forEach((coll) => {
    const { collocation, words } = coll
    const collocationType = collocation.trim()

    // Initialize if not already present
    if (!collocations[collocationType]) {
      collocations[collocationType] = ''
    }

    // Append words to corresponding type
    collocations[collocationType] +=
      (collocations[collocationType] ? ', ' : '') + words
    columns.add(collocationType)
  })

  // Prepare row with vocab, pos, meaning, and collocations
  const row = [vocab, pos, meaning]
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
