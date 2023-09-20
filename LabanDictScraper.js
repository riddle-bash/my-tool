import { fs } from './deps.ts'
import { path } from './deps.ts'
import { log } from './deps.ts'
import { download } from './deps.ts'
import { sleepRandomAmountOfSeconds } from 'https://deno.land/x/sleep/mod.ts'
import { postgres } from './deps.ts'

const WORD_FILE = './in/get_df_1.txt'

/**
 * Init logger
 */
await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler('DEBUG'),

    file: new log.handlers.FileHandler('INFO', {
      filename: `./laban.log`,
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

async function readWords(file) {
  const words = new Set()

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

            words.add(lm)
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
    logger.warning(`Read words file ${file} error: ${err.message}`)
  }

  return [...words]
}

async function lookup(words, outputFile) {
  const api = 'https://dict.laban.vn/ajax/find?type=1&query='

  logger.info('Begining scan https://dict.laban.vn ...')

  let url
  let lemma
  let response
  let data
  const length = words.length
  //const length = 120;
  const results = new Set()

  let rs

  let viData
  let enData
  let viCount = 0
  let enCount = 0

  Deno.writeTextFileSync(outputFile, '[')
  for (let i = 0; i < length; i++) {
    lemma = words[i]
    rs = Object.assign({}, lemma)
    rs.data = {}
    url = `${api}${lemma.lemma}`
    try {
      response = await fetch(url)
      data = await response.json()
      //console.log(data);

      rs.data.error = data.error

      if (data.error === 0) {
        viData = data.enViData?.best
        enData = data.enEnData?.best

        if (
          viData &&
          viData.word?.toLowerCase() === lemma.lemma.toLowerCase()
        ) {
          rs.data.vi = viData.details?.trim()
          viCount++
        }

        if (
          enData &&
          enData.word?.toLowerCase() === lemma.lemma.toLowerCase()
        ) {
          rs.data.en = enData.details?.trim()
          enCount++
        }
      }
    } catch (err) {
      console.warn('Error: ', err.message)
      rs.data.error = 9999
      rs.data.message = err.message
    }
    results.add(rs)

    if (i > 0 && i % 100 === 0) {
      console.log(
        `Scanned ${i + 1} words, vi count: ${viCount}, en count: ${enCount}`
      )
      const batch = JSON.stringify([...results])
      if (i > 100) {
        Deno.writeTextFileSync(outputFile, ',', {
          append: true,
        })
      }

      Deno.writeTextFileSync(outputFile, batch.substring(1, batch.length - 1), {
        append: true,
      })
      results.clear()
    }

    await sleepRandomAmountOfSeconds(0.01, 0.05, true)
  }

  if (results.size > 0) {
    Deno.writeTextFileSync(outputFile, ',', {
      append: true,
    })
    const batch = JSON.stringify([...results])
    Deno.writeTextFileSync(outputFile, batch.substring(1, batch.length - 1), {
      append: true,
    })
  }

  Deno.writeTextFileSync(outputFile, ']', {
    append: true,
  })

  logger.info(
    `Scanned total ${length} words, vi count: ${viCount}, en count: ${enCount}`
  )
}

const words = await readWords(WORD_FILE)
logger.info(`Found ${words.length} words`)

await lookup(words, './out/df_laban_1.json')

logger.info('DONE!')
