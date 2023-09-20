import { log } from './deps.ts'
import axios from 'npm:axios'
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs'

const API_URL = 'http://192.168.11.162/api'

/**
 * Init logger
 */
await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler('DEBUG'),

    file: new log.handlers.FileHandler('INFO', {
      filename: `./refine.log`,
      // you can change format of output message using any keys in `LogRecord`.
      //formatter: "{datetime} {levelName} {msg}",
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
    // configure default logger available via short-hand methods above.
    default: {
      level: 'DEBUG',
      handlers: ['console', 'file'],
    },
  },
})

//Get default logger
const logger = log.getLogger()

async function readLemmas(file) {
  const lemmas = new Set()

  try {
    const texts = await Deno.readTextFile(file)
    const lines = texts.split('\n')
    logger.info(`Loaded ${lines.length} line of file ${file}`)
    let lmCnt = 0
    let noWordFormCnt = 0
    let noRankCnt = 0
    let totalWordCnt = 0
    lines.forEach((line) => {
      let arr = line
        .split('->')
        .map((txt) => txt.trim())
        .filter((txt) => txt.length > 0)
      if (arr.length > 0) {
        const lm = {}
        //left => lemma, right => word forms
        if (arr[0]) {
          let left = arr[0]
            .split('/')
            .map((txt) => txt.trim())
            .filter((txt) => txt.length > 0)

          if (left[0]) {
            lmCnt++
            totalWordCnt++

            lm.lemma = left[0]

            lemmas.add(lm)
          }

          if (left[1]) {
            lm.rank = left[1]
          } else {
            noRankCnt++
          }
        }

        if (arr[1]) {
          let right = arr[1]
            .split(',')
            .map((txt) => txt.trim())
            .filter((txt) => txt.length > 0)
          lm.word_forms = right
          if (right.length === 0) {
            noWordFormCnt++
          } else {
            totalWordCnt += right.length
          }

          lm.forms = right.join(', ')
        } else {
          noWordFormCnt++
          logger.warning(`No word form, line: "${line}"`)
        }
      }
    })

    logger.info(
      `Lemma count: ${lmCnt}, total words count: ${totalWordCnt} no rank count: ${noRankCnt}, no word forms count: ${noWordFormCnt}`
    )
  } catch (err) {
    logger.warning(`Read lemmas file ${file} error: ${err.message}`)
  }

  return [...lemmas]
}

async function getDefinitions() {
  try {
    const startTime = Date.now()

    const result = await axios.get(
      `${API_URL}/vocabs?type=definition&start=-1&end=-1`
    )

    //const data = await result.json();
    console.log('Got result in', Date.now() - startTime, 'ms')
    console.log(`Total definitions: ${result.data.vocabs.length}`)

    return result.data.vocabs
  } catch (err) {
    console.error('Get dictionary definitions error:', err)
  }
}

async function getDictLemmas() {
  try {
    const startTime = Date.now()

    const result = await axios.get(
      `${API_URL}/vocabs?type=lemma&start=-1&end=-1`
    )

    //const data = await result.json();
    console.log('Got result in', Date.now() - startTime, 'ms')
    const lemmas = Object.values(result.data)
    console.log(`Total lemmas: ${lemmas.length}`)

    return lemmas
  } catch (err) {
    console.error('Get dictionary definitions error:', err)
  }
}

async function readLemmaJson(file) {
  try {
    let texts = await Deno.readTextFile(file)

    if (!texts.endsWith(']')) {
      texts = texts + ']'
    }

    const json = JSON.parse(texts)
    //logger.info(`Loaded ${json.length} lemmas of file ${file}`);
    return json
  } catch (err) {
    logger.warning(`Read lemmas file ${file} error: ${err.message}`)
  }

  return []
}

async function analyzeLemma(resultFile) {
  console.log(`Analyzing file ${resultFile}`)
  const st = Date.now()

  const lemmas = await readLemmaJson(resultFile)
  console.log(`Loaded ${lemmas.length} lemmas`)

  let lemma
  const lemmaMap = {}
  const wordFormMap = {}
  const entries = []
  let wordForms

  const lemmaSet = new Set()
  const wordFormSet = new Set()
  const vocabSet = new Set()

  for (let i = 0; i < lemmas.length; i++) {
    lemma = lemmas[i]
    lemmaSet.add(lemma.lemma)
    lemma.word_forms.forEach((wf) => {
      wordFormSet.add(wf)
    })

    if (lemma.data && lemma.data.entries.length > 0) {
      lemmaMap[lemma.lemma] = lemma.data
      entries.push(...lemma.data.entries)
    }

    if (lemma.word_forms_data?.length > 0) {
      //Word form entries
      wordForms = lemma.word_forms_data

      for (let j = 0; j < wordForms.length; j++) {
        if (
          !wordFormMap[wordForms[j].vocab] &&
          wordForms[j].entries.length > 0
        ) {
          wordFormMap[wordForms[j].vocab] = wordForms[j]
          const formEntries = wordForms[j].entries
          for (let k = 0; k < formEntries.length; k++) {
            if (formEntries[k].vocab !== lemma.lemma) {
              entries.push(formEntries[k])
            }
          }
        }
      }
    }
  }

  const keyEntries =
    Object.keys(wordFormMap).length + Object.keys(lemmaMap).length

  logger.info(
    `Found total ${entries.length} entries. Keys lemma count: ${
      Object.keys(lemmaMap).length
    }, key word forms count: ${
      Object.keys(wordFormMap).length
    }, total: ${keyEntries}`
  )

  const dictLemmas = await getDictLemmas()
  let vocab
  let entry
  let act
  const result = []
  let removeCnt = 0
  for (let i = 0; i < dictLemmas.length; i++) {
    entry = dictLemmas[i]
    vocab = entry.vocab.toLowerCase()
    act = {}

    act.id = entry.id
    act.vocab = entry.vocab
    act.pos = entry.pos
    act.defs = entry.defs?.length || 0

    if (wordFormSet.has(vocab) && !(lemmaMap[vocab] || wordFormMap[vocab])) {
      act.action = 'Remove lemma'
      removeCnt++
    } else {
      act.action = ''
    }
    result.push(act)
  }

  let addCnt = 0
  let exist
  let warnCnt = 0
  for (let i = 0; i < entries.length; i++) {
    entry = entries[i]
    act = {}

    act.id = entry.id
    act.vocab = entry.vocab
    act.pos = entry.pos
    act.defs = entry.defs.length
    exist = dictLemmas.find((entr) => entr.vocab === entry.vocab)
    if (!exist) {
      act.action = 'Add lemma'
      addCnt++

      result.push(act)
    } else {
      if (exist.defs.length !== entry.defs.length) {
        warnCnt++
        logger.warning(
          `Exist entry ${exist.vocab} defs: ${exist.defs.length} != ${entry.defs.length} `
        )
      }
    }
  }

  console.log(
    `Finished analytic in ${(Date.now() - st) / 60000}s. Total entries: ${
      result.length
    }, remove: ${removeCnt}, add: ${addCnt}. Exist but has different defs: ${warnCnt}.`
  )
  const wb = XLSX.utils.book_new()

  const ws = XLSX.utils.json_to_sheet(result, { nullError: true })
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `./refine_lemmas.xlsx`, {
    compression: true,
  })
}

//const dictLemmas = await getDictLemmas();
//console.log(dictLemmas[0]);
//await analyzeLemma("./lemmas_wordforms_en.json");

const LEMMAS_FILE = 'C:/Users/thangqm/My Workspace/lemma.en.txt'
const lemmas = await readLemmas(LEMMAS_FILE)
console.log(`Loaded ${lemmas.length} lemmas from file.`)

const WORD_FORMS = new Set()

for (let i = 0; i < lemmas.length; i++) {
  if (lemmas[i].word_forms) {
    lemmas[i].word_forms.forEach((f) => WORD_FORMS.add(f))
  }
}

console.log(`Found ${WORD_FORMS.size} variant word forms`)

const defs = await getDefinitions()
const dictLemmas = await getDictLemmas()

//Find combined defs
let txt
let arr

let splitCnt = 0
let isWordFormCnt = 0
let notFoundLemmaCnt = 0
let noActionCnt = 0
let addExpCnt = 0

const refineDefs = []
const st = Date.now()
for (let i = 0; i < defs.length; i++) {
  txt = defs[i].def.def
  if (txt.endsWith(':')) {
    txt = txt.substring(0, txt.length - 1)
  }

  const d = Object.assign({ id: defs[i].def.id }, defs[i])
  d.def = txt

  delete d.uk
  delete d.us
  delete d.pron_uk
  delete d.pron_us

  arr = txt.split(':')

  if (lemmas.find((le) => le.lemma === d.vocab.toLowerCase())) {
    if (arr.length > 1) {
      d.action = 'Split definition'
      splitCnt++
    } else {
      d.action = ''
      noActionCnt++
    }
  } else if (!WORD_FORMS.has(d.vocab.toLowerCase())) {
    d.action = '??? (Not found lemma and word forms)'
    notFoundLemmaCnt++
  } else {
    d.action = 'Remove lemma'
    isWordFormCnt++
  }

  if (i % 1000 === 0) {
    console.log('Processing def index: ', i)
  }

  refineDefs.push(d)
}

console.log(
  `Finished analytic in ${(Date.now() - st) / 60000}s. Total defs: ${
    refineDefs.length
  }, need to split: ${splitCnt}, will be remove: ${isWordFormCnt}, not found lemmas: ${notFoundLemmaCnt}, no action: ${noActionCnt}.`
)

const wb = XLSX.utils.book_new()

const ws = XLSX.utils.json_to_sheet(refineDefs, { nullError: true })
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
XLSX.writeFile(wb, `./wordlist.xlsx`, {
  compression: true,
})

//console.log(defs[0]);
