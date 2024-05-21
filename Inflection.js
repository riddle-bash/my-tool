//import { log } from './deps.js'
import { runQuery } from './DbUtil.js'
import { INFLECTS } from './helper.js'
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs'

/**
 * Init logger
 */
/*
await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler('DEBUG'),

    file: new log.handlers.FileHandler('INFO', {
      filename: `./inflections.log`,
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
*/
async function checkWord(existFile, newFile, outFile) {
  const text1 = await Deno.readTextFile(existFile)
  const wordList = text1.split('\n').map((w) => w.toLowerCase().trim())

  const text2 = await Deno.readTextFile(newFile)
  const checkList = text2.split('\n').map((w) => w.toLowerCase().trim())

  const newWords = new Set()

  for (let i = 0; i < checkList.length; i++) {
    if (!wordList.includes(checkList[i])) {
      newWords.add(checkList[i])
    }
  }

  Deno.writeTextFileSync(outFile, [...newWords].join('\n'))

  console.log(
    `Exist count: ${wordList.length}, check count: ${checkList.length}, new words found: ${newWords.size}`
  )
}

async function insertWord(file) {
  const text = await Deno.readTextFile(file)
  const wordList = JSON.parse(text)

  let lemmaCnt = 0
  let inflectCnt = 0

  const sql =
    'Insert into _words (word, lemmas, inflections) values ($1, $2, $3)'
  let successCnt = 0
  let failCnt = 0
  for (let i = 0; i < wordList.length; i++) {
    try {
      const { word, lemmas = {}, inflections = {} } = wordList[i]

      if (Object.keys(lemmas).length > 0) {
        lemmaCnt++
      }

      if (Object.keys(inflections).length > 0) {
        inflectCnt++
      }

      if (
        Object.keys(lemmas).length > 0 ||
        Object.keys(inflections).length > 0
      ) {
        await runQuery(sql, [
          word,
          Object.keys(lemmas).length > 0 ? lemmas : null,
          Object.keys(inflections).length > 0 ? inflections : null,
        ])
        successCnt++
      }
    } catch (err) {
      failCnt++
      logger.warning(`Insert ${wordList[i].word} error: ${err.message}`)
    }
  }

  //let rows = await runQuery('Select * from users')
  //console.log(rows)

  console.log(
    'Lemmatizer count:',
    lemmaCnt,
    ', inflection count:',
    inflectCnt,
    ', success:',
    successCnt,
    ', failed:',
    failCnt
  )
}

async function getLemmaForInflect(outFile) {
  const result = await runQuery(
    'select * from _words where lemmas is not null and inflections is null'
  )

  const rows = result.rows
  const words = new Set()
  console.log(`Found ${rows.length} records`)
  let cnt = 0
  for (let i = 0; i < rows.length; i++) {
    //console.log(rows[i])
    const lemmas = Object.values(rows[i].lemmas).reduce(
      (prv, cur) => prv.concat(cur),
      []
    )

    if (!lemmas.includes(rows[i].word)) {
      lemmas.forEach((lm) => words.add(lm))
    } else {
      cnt++
    }
  }

  Deno.writeTextFileSync(outFile, [...words].join('\n'))
  console.log(`Found ${words.size} lemmas`)
}

async function getAvailableInflections(outFile) {
  const result = await runQuery(
    'select * from _words where inflections is not null'
  )
  const rows = result.rows

  Deno.writeTextFileSync(outFile, JSON.stringify(rows))
}

/**
 * File content must be [{word, inflections, lemmas (optional)}, {...}, ...]
 * @param {*} file
 */
async function updateInflections2DB(file) {
  const text = await Deno.readTextFile(file)

  const inflections = JSON.parse(text).filter((item) => item.inflects)

  console.log(`Found ${inflections.length} words that have inflections`)
  let cnt = 0
  let result
  let row
  const updateds = []
  const warningWords = []
  const notFoundWords = []
  for (let i = 0; i < inflections.length; i++) {
    const { word, inflects } = inflections[i]
    result = await runQuery('select vocab, json from vocabs where vocab = $1', [
      word,
    ])

    //console.log(result)
    if (result.rowCount > 1) {
      console.warn(`Found more than vocab has the same word: ${word}`)
      warningWords.push(word)
    }

    row = result.rows[0]

    const vocab = row?.vocab
    const json = row?.json

    if (json) {
      cnt++
      json.inflects = inflects

      // await runQuery('update vocabs set json = $1 where vocab = $2', [
      //   json,
      //   vocab,
      // ])
      updateds.push(vocab)
    } else {
      //Not found in vocabs table
      notFoundWords.push(word)
    }
  }

  console.log(
    `Update success ${cnt} vocabs, warning: ${warningWords.length}, not found: ${notFoundWords.length}`
  )
  Deno.writeTextFileSync(
    './out/not_in_dict.txt',
    notFoundWords.sort().join('\n')
  )
  //console.log(updateds)
  //console.log(warningWords)
}

async function getVocabNoInflects(outFile) {
  const text = await Deno.readTextFile('./in/inflections.json')
  const wordList = JSON.parse(text)

  console.log('Word list:', wordList.length)

  const result = await runQuery('select * from vocabs')
  const rows = result.rows
  const words = []
  for (let i = 0; i < rows.length; i++) {
    const { vocab, json } = rows[i]

    if (
      !wordList.find((w) => w['WORD'] === vocab) &&
      vocab.split(/\s/).length === 1
    ) {
      words.push(vocab)
    }

    // if (!json.inflects && vocab.split(/\s/).length === 1) {
    //   words.push(vocab)
    // }
  }

  console.log(`Found ${words.length} vocab don't have inflections`)
  Deno.writeTextFileSync(outFile, [...words].join('\n'))
}

async function updateFromAzVocab(file) {
  const text = await Deno.readTextFile(file)
  const vocabs = text.split('\n')

  const sql = `insert into _words (word, in_azvocab) values ($1, $2) ON CONFLICT (word) DO UPDATE SET in_azvocab = TRUE`
  let cnt = 0
  for (let i = 0; i < vocabs.length; i++) {
    await runQuery(sql, [vocabs[i], 'TRUE'])
    cnt++
  }

  console.log(`Insert/updated ${cnt}/${vocabs.length} vocabs`)
}

async function getDistinctLemmas(outFile) {
  const result = await runQuery(
    'select lemmas from _words where lemmas is not null'
  )
  const rows = result.rows
  const list = new Set()
  let cnt = 0
  for (let i = 0; i < rows.length; i++) {
    const { lemmas } = rows[i]

    const alls = Object.values(lemmas).reduce((prv, cur) => prv.concat(cur), [])
    alls.forEach((w) => list.add(w))
    cnt++
  }

  console.log(`Process ${cnt} records, found ${list.size} distinct lemmas`)
  Deno.writeTextFileSync(outFile, [...list].join('\n'))
}

async function exportWordForms(outFile) {
  const result = await runQuery(
    'select word, inflections from _words where inflections is not null'
  )

  const rows = result.rows
  const set = new Set()
  const vocabs = []

  for (let i = 0; i < rows.length; i++) {
    const { word, inflections } = rows[i]

    const record = { Word: word.toLowerCase().trim() }
    const vocab = { word: word.toLowerCase().trim() }
    const inflects = {}
    for (const [key, value] of Object.entries(inflections)) {
      if (INFLECTS[key]) {
        if (key === 'NNS') {
          const newForms = value.filter(
            (v) => v.toLowerCase() !== word.toLowerCase()
          )

          if (newForms.length > 0) {
            record[INFLECTS[key]] = newForms.join('; ')
            inflects[key] = newForms
          }
        } else if (value.length > 0) {
          inflects[key] = value
          record[INFLECTS[key]] = value.join('; ')
        }
      }
    }

    if (Object.keys(record).length > 1) {
      set.add(record)
      vocab.inflects = inflects
      vocabs.push(vocab)
    }
  }

  const list = [...set]
  list.sort((a, b) => a.Word.localeCompare(b.Word))

  //console.log(list.slice(0, 2))
  const wb = XLSX.utils.book_new()

  const ws = XLSX.utils.json_to_sheet(list, { nullError: true })
  XLSX.utils.book_append_sheet(wb, ws, 'Word_Forms')
  XLSX.writeFile(wb, `${outFile}.xlsx`, {
    compression: true,
  })

  Deno.writeTextFileSync(`${outFile}.json`, JSON.stringify(vocabs))
}

async function json2Excel(inFile, outFile) {
  const text = await Deno.readTextFile(inFile)
  const list = JSON.parse(text)

  const wb = XLSX.utils.book_new()

  const ws = XLSX.utils.json_to_sheet(list, { nullError: true })
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${outFile}.xlsx`, {
    compression: true,
  })
}

async function excel2Json(inFile, outFile) {
  let workbook = XLSX.readFile(inFile, { type: 'binary' })
  const wsname = workbook.SheetNames[0]
  const ws = workbook.Sheets[wsname]

  /* Convert array to json*/
  const dataParse = XLSX.utils.sheet_to_json(ws, { defval: '' })
  for (let i = 0; i < dataParse.length; i++) {
    console.log(dataParse[i])
  }

  Deno.writeTextFileSync(`${outFile}.json`, JSON.stringify(dataParse))
}
//await getLemmaForInflect('./out/lemmas_03.txt')

//await insertWord('./in/all_lemmas.json')
//await insertWord('./in/new_words.json')
// await checkWord(
//   './in/all_words.txt',
//   './in/words_alpha.txt',
//   './out/new_words.txt'
// )

//await validate('./in/inflections_02.json')

//await generateLemmas()

//await getAvailableInflections('./out/inflections.json')

//await updateInflections2DB('./out/word_forms.json')

//await getVocabNoInflects('./out/lemmas_04.txt')

//await updateFromAzVocab('./in/azvocab_dict_2023_10_03.txt')

//await getDistinctLemmas('./out/all_lemmas.txt')

//await exportWordForms('./out/word_forms')

//await json2Excel('./in/missing_def.json', './out/missing_defs')

await excel2Json('./in/error_missing_defs.xlsx', './out/error_missing_defs')
