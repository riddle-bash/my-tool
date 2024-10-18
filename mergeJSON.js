const FILENAME = 'thesaurus_results'
const NUM_PARTITIONS = 8
const OUTPUT_FILE = './out/thesaurus_results.json'

async function readFile(file) {
  const parsedData = await Deno.readTextFile(file)
  const dataJson = JSON.parse(parsedData)

  return dataJson
}

async function mergeJSON() {
  let results = []

  for (let i = 1; i <= 8; i++) {
    const data = await readFile(`./out/${FILENAME}_${i}.json`)

    results = [...results, ...data]
  }

  // Write results to JSON file
  await Deno.writeTextFile(OUTPUT_FILE, JSON.stringify(results, null, 2))
  console.log(`Scraping complete. Results saved to ${OUTPUT_FILE}`)
}

mergeJSON()
