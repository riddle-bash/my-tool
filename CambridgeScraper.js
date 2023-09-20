import { fs } from './deps.ts'
import { path } from './deps.ts'
import { log } from './deps.ts'
import { download } from './deps.ts'
import { sleepRandomAmountOfSeconds } from 'https://deno.land/x/sleep/mod.ts'
import { postgres } from './deps.ts'
import { DOMParser } from 'https://esm.sh/linkedom'
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs'

const WORDS_FILE = './in/get_df_1.txt'

/**
 * Init logger
 */
await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler('DEBUG'),

    file: new log.handlers.FileHandler('INFO', {
      filename: `./cambridge_scraper.log`,
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
      `Words count: ${lmCnt}, total words count: ${totalWordCnt} no rank count: ${noRankCnt}, no word forms count: ${noWordFormCnt}`
    )
  } catch (err) {
    logger.warning(`Read words file ${file} error: ${err.message}`)
  }

  return [...words]
}

async function readJson(file) {
  try {
    let texts = await Deno.readTextFile(file)

    if (!texts.endsWith(']')) {
      texts = texts + ']'
    }

    const json = JSON.parse(texts)
    //logger.info(`Loaded ${json.length} words of file ${file}`);
    return json
  } catch (err) {
    logger.warning(`Read words file ${file} error: ${err.message}`)
  }

  return []
}

async function lookup(apiUrl, words, outputFile, startIndex) {
  logger.info(`Begining scan ${apiUrl}, start index = ${startIndex} ...`)

  let url
  let lemma
  let response
  let data
  const length = words.length
  //const length = 1;
  const results = new Set()

  let rs
  let html
  let content
  let entryCnt = 0
  let dataCount = 0
  const parser = new DOMParser()
  let written = false
  let retryCnt = 0
  let parentClass

  if (startIndex === 0) {
    Deno.writeTextFileSync(outputFile, '[')
  }

  for (let i = startIndex; i < length; i++) {
    lemma = words[i]
    rs = Object.assign({}, lemma)
    if (!rs.data) {
      entryCnt++
      url = `${apiUrl}${lemma.lemma}`
      do {
        retryCnt = 0
        try {
          response = await fetch(url, {
            'Content-Type': 'text/html',
          })

          data = await response.text()
          html = parser.parseFromString(data)
          content = html.getElementById('page-content')
          if (content) {
            outer: for (let j = 0; j < content.childNodes.length; j++) {
              parentClass = content.childNodes[j].className
              if (parentClass === 'entry-body') {
                //console.log("Found entry-body class ...");
                //Cambridge Vietnamese
                let node = content.childNodes[j]
                for (let k = 0; k < node.childNodes.length; k++) {
                  if (node.childNodes[k].className === 'pr dictionary') {
                    let child = node.childNodes[k]
                    //Only get first definition set
                    for (let t = 0; t < child.childNodes.length; t++) {
                      if (child.childNodes[t].className === 'link dlink') {
                        dataCount++
                        rs.data = child.childNodes[t].innerHTML
                        break outer
                      }
                    }
                  }
                }
              } else if (parentClass === 'page') {
                //console.log("Found page class ...");
                //Cambridge English
                let node = content.childNodes[j]
                for (let k = 0; k < node.childNodes.length; k++) {
                  // console.log(
                  //   `Node: ${k}/${node.childNodes.length}, class: ${node.childNodes[k].className}`
                  // );
                  //First pr dictionary = UK dictionary, second = American dictionary
                  if (node.childNodes[k].className === 'pr dictionary') {
                    let child = node.childNodes[k]
                    //Only get first definition set
                    for (let t = 0; t < child.childNodes.length; t++) {
                      // console.log(
                      //   `Node: ${t}/${child.childNodes.length}, class: ${child.childNodes[t].className}`
                      // );
                      if (child.childNodes[t].className === 'link') {
                        dataCount++

                        //Parse and get only meaningful data
                        rs.data = parseEnData(
                          child.childNodes[t].innerHTML,
                          lemma.lemma
                        )
                        break outer
                      }
                    }
                  }
                }
              }
            }
          } else {
            logger.warning(`Not found page-content of lemma ${lemma.lemma}`)
          }
          //console.log(data);

          //Success, set retry count = 3 to pass do while loop
          retryCnt = 4
        } catch (err) {
          retryCnt++
          console.warn(`Tryed ${retryCnt}. Error: `, err)

          if (retryCnt > 3) {
            rs.error = { code: 9999, message: err.message }
          }

          await sleepRandomAmountOfSeconds(3, 5, true)
        }
      } while (retryCnt <= 3)

      await sleepRandomAmountOfSeconds(0.5, 1, true)
    }

    results.add(rs)

    if (entryCnt > 0 && entryCnt % 10 === 0 && results.size > 0) {
      console.log(
        `Scanned ${entryCnt}/${
          length - startIndex
        } words, data count: ${dataCount}`
      )
      const batch = JSON.stringify([...results])

      if (written || startIndex > 0) {
        Deno.writeTextFileSync(outputFile, ',', {
          append: true,
        })
      }

      Deno.writeTextFileSync(outputFile, batch.substring(1, batch.length - 1), {
        append: true,
      })

      written = true
      results.clear()
    }
  }

  if (results.size > 0) {
    if (written) {
      Deno.writeTextFileSync(outputFile, ',', {
        append: true,
      })
    }

    const batch = JSON.stringify([...results])

    Deno.writeTextFileSync(outputFile, batch.substring(1, batch.length - 1), {
      append: true,
    })

    written = true
  }

  if (written && startIndex < length) {
    Deno.writeTextFileSync(outputFile, ']', {
      append: true,
    })
  }

  logger.info(
    `Finish scanned total ${entryCnt}/${
      length - startIndex
    } words, data count: ${dataCount}`
  )
}

async function lookupWordForm(apiUrl, words, outputFile, startIndex) {
  logger.info(`Begining scan ${apiUrl}, start index = ${startIndex} ...`)

  let url
  let lemma
  let response
  let data
  const length = words.length
  //const length = 1;
  const results = new Set()

  let rs
  let html
  let content
  let entryCnt = 0
  let dataCount = 0
  const parser = new DOMParser()
  let written = false
  let retryCnt = 0
  let parentClass
  let wordForms
  let wordFormsData
  let vocab
  if (startIndex === 0) {
    Deno.writeTextFileSync(outputFile, '[')
  }

  for (let i = startIndex; i < length; i++) {
    lemma = words[i]
    wordForms = lemma.word_forms || []
    wordFormsData = []
    rs = Object.assign({}, lemma)
    if (!rs.word_forms_data && wordForms.length > 0) {
      entryCnt++
      for (let wf = 0; wf < wordForms.length; wf++) {
        vocab = wordForms[wf]
        url = `${apiUrl}${vocab}`
        do {
          retryCnt = 0
          try {
            response = await fetch(url, {
              'Content-Type': 'text/html',
            })

            data = await response.text()
            html = parser.parseFromString(data)
            content = html.getElementById('page-content')
            if (content) {
              outer: for (let j = 0; j < content.childNodes.length; j++) {
                parentClass = content.childNodes[j].className
                if (parentClass === 'entry-body') {
                  //console.log("Found entry-body class ...");
                  //Cambridge Vietnamese
                  let node = content.childNodes[j]
                  for (let k = 0; k < node.childNodes.length; k++) {
                    if (node.childNodes[k].className === 'pr dictionary') {
                      let child = node.childNodes[k]
                      //Only get first definition set
                      for (let t = 0; t < child.childNodes.length; t++) {
                        if (child.childNodes[t].className === 'link dlink') {
                          dataCount++
                          rs.data = child.childNodes[t].innerHTML
                          break outer
                        }
                      }
                    }
                  }
                } else if (parentClass === 'page') {
                  //console.log("Found page class ...");
                  //Cambridge English
                  let node = content.childNodes[j]
                  for (let k = 0; k < node.childNodes.length; k++) {
                    // console.log(
                    //   `Node: ${k}/${node.childNodes.length}, class: ${node.childNodes[k].className}`
                    // );
                    //First pr dictionary = UK dictionary, second = American dictionary
                    if (node.childNodes[k].className === 'pr dictionary') {
                      let child = node.childNodes[k]
                      //Only get first definition set
                      for (let t = 0; t < child.childNodes.length; t++) {
                        // console.log(
                        //   `Node: ${t}/${child.childNodes.length}, class: ${child.childNodes[t].className}`
                        // );
                        if (child.childNodes[t].className === 'link') {
                          dataCount++

                          //Parse and get only meaningful data
                          const parsed = parseEnData(
                            child.childNodes[t].innerHTML,
                            vocab,
                            lemma.lemma
                          )

                          if (
                            parsed.entries.length > 0 &&
                            !wordFormsData.find(
                              (wr) => wr.vocab === parsed.vocab
                            )
                          ) {
                            wordFormsData.push(parsed)
                          }

                          break outer
                        }
                      }
                    }
                  }
                }
              }
            } else {
              logger.warning(`Not found page-content of word ${vocab}`)
            }
            //console.log(data);

            //Success, set retry count = 3 to pass do while loop
            retryCnt = 4
          } catch (err) {
            retryCnt++
            console.warn(`Tryed ${retryCnt}. Error: `, err)

            if (retryCnt > 3) {
              rs.error = { code: 9999, message: err.message }
            }

            await sleepRandomAmountOfSeconds(3, 5, true)
          }
        } while (retryCnt <= 3)

        await sleepRandomAmountOfSeconds(0.5, 1, true)
      }

      rs.word_forms_data = wordFormsData
    }

    results.add(rs)

    if (entryCnt > 0 && entryCnt % 10 === 0 && results.size > 0) {
      console.log(
        `Scanned ${entryCnt}/${
          length - startIndex
        } words, data count: ${dataCount}`
      )
      const batch = JSON.stringify([...results])

      if (written || startIndex > 0) {
        Deno.writeTextFileSync(outputFile, ',', {
          append: true,
        })
      }

      Deno.writeTextFileSync(outputFile, batch.substring(1, batch.length - 1), {
        append: true,
      })

      written = true
      results.clear()
    }
  }

  if (results.size > 0) {
    if (written) {
      Deno.writeTextFileSync(outputFile, ',', {
        append: true,
      })
    }

    const batch = JSON.stringify([...results])

    Deno.writeTextFileSync(outputFile, batch.substring(1, batch.length - 1), {
      append: true,
    })

    written = true
  }

  if (written && startIndex < length) {
    Deno.writeTextFileSync(outputFile, ']', {
      append: true,
    })
  }

  logger.info(
    `Finish scanned total ${entryCnt}/${
      length - startIndex
    } words, data count: ${dataCount}`
  )
}

const MEDIA_URL = 'https://dictionary.cambridge.org'

function parseEnData(htmlData, word, lemma) {
  const data = { vocab: word, pron_uk: '', pron_us: '', entries: [] }

  let entry
  let def

  const parser = new DOMParser()
  const html = parser.parseFromString(htmlData)
  const childs = html.querySelectorAll('.pr.entry-body__el')
  for (let i = 0; i < childs.length; i++) {
    const node = childs[i]
    entry = {
      id: `${word}.${i + 1}`,
      uk: '',
      us: '',
      pos: '',
      defs: [],
      idioms: [],
      verb_phrases: [],
    }
    const titleNode = node.querySelector('.di-title')
    const posNode = node.querySelector('.pos.dpos')
    //console.log(`POS: ${posNode.innerText}`);
    if (posNode) {
      entry.pos = posNode.innerText.trim()
    } else {
      logger.warning(`Not found POS of word ${word}`)
    }

    if (titleNode) {
      const vocab = titleNode.innerText.trim()
      if (lemma && vocab.toLowerCase() === lemma) {
        logger.info(`Found result of original lemma ${lemma}, ignore ...`)

        break
      }

      if (vocab !== word) {
        logger.info(
          `Found other form of word ${word} => ${vocab}, lemma: ${
            lemma || word
          }`
        )
        entry.vocab = vocab
      }
    }

    if (entry.pos === 'prefix' || entry.pos === 'suffix') {
      if (titleNode) {
        logger.info(
          `Ignore prefix/suffix entry ${titleNode.innerText} of word ${word}`
        )
      } else {
        logger.warning(`Ignore prefix/suffix of word ${word}`)
      }
      continue
    }

    const ukNode = node.querySelector('.uk')
    if (ukNode) {
      const ukAu = ukNode.querySelector('audio>source[type=audio/mpeg]')
      //console.log(`UK audio: ${MEDIA_URL}${ukAu.getAttribute("src")}`);
      if (ukAu) {
        const path = `${MEDIA_URL}${ukAu.getAttribute('src').trim()}`
        if (!data.pron_uk) {
          data.pron_uk = path
        } else {
          if (data.pron_uk !== path) {
            entry.pron_uk = path
            logger.info(
              `Found difference UK audio of word ${word}, entry index: ${i}`
            )
          }
        }
      } else if (!data.pron_uk) {
        logger.warning(`Not found UK audio of word ${word}, entry index: ${i}`)
      }

      const ukPron = ukNode.querySelector('.pron.dpron')
      //console.log(`UK pron: ${ukPron.innerText}`);

      if (ukPron) {
        entry.uk = ukPron.innerText
      } else {
        logger.warning(`Not found UK pron of word ${word}, entry index: ${i}`)
      }
    } else {
      logger.warning(`Not found UK info of word ${word}, entry index: ${i}`)
    }

    const usNode = node.querySelector('.us')
    if (usNode) {
      const usAu = usNode.querySelector('audio>source[type=audio/mpeg]')
      //console.log(`US audio: ${MEDIA_URL}${usAu.getAttribute("src")}`);
      if (usAu) {
        const path = `${MEDIA_URL}${usAu.getAttribute('src').trim()}`
        if (!data.pron_us) {
          data.pron_us = path
        } else {
          if (data.pron_us !== path) {
            entry.pron_us = path
            logger.info(
              `Found difference US audio of word ${word}, entry index: ${i}`
            )
          }
        }
      } else if (!data.pron_us) {
        logger.warning(`Not found US audio of word ${word}, entry index: ${i}`)
      }

      const usPron = usNode.querySelector('.pron.dpron')
      //console.log(`US pron: ${usPron.innerText}`);
      if (usPron) {
        entry.us = usPron.innerText
      } else {
        logger.warning(`Not found US pron of word ${word}, entry index: ${i}`)
      }
    } else {
      logger.warning(`Not found US info of word ${word}, entry index: ${i}`)
    }

    const defNodes = node.querySelectorAll('.def-block.ddef_block')
    //console.log(`Def count: ${defNodes.length}`);
    for (let j = 0; j < defNodes.length; j++) {
      const defNode = defNodes[j]
      def = {
        id: `${entry.id}.${j + 1}`,
        def: '',
        level: '',
        images: [],
        examples: [],
        antonyms: [],
        synonyms: [],
        collocations: [],
      }
      const levelNode = defNode.querySelector('.epp-xref')

      if (levelNode) {
        def.level = levelNode.innerText.trim()
      }

      const dNode = defNode.querySelector('.def.ddef_d.db')
      if (dNode) {
        def.def = dNode.innerText.trim()
        if (def.def.endsWith(':')) {
          def.def = def.def.substring(0, def.def.length - 1)
        }
      } else {
        logger.warning(`Not found def node of word ${word}`)
      }

      const expNodes = defNode.querySelectorAll('.examp.dexamp')
      if (expNodes.length > 0) {
        for (let k = 0; k < expNodes.length; k++) {
          def.examples.push(expNodes[k].innerText.trim())
        }
      } else {
        //Try to find examples in parent node
        const parentNode = defNode.parentNode
        if (parentNode) {
          const extExamps = parentNode.querySelectorAll('.eg.dexamp')

          for (let m = 0; m < extExamps.length; m++) {
            def.examples.push(extExamps[m].innerText.trim())
          }
        }

        if (def.examples.length > 0) {
          logger.info(`Found extended examples of word ${word}`)
        } else {
          logger.warning(`Not found examples of word ${word}, def: ${def.def}`)
        }
      }

      //if (def.examples.length > 0) {
      entry.defs.push(def)
      //}
    }

    let idiomNode = node.querySelector('.xref.idioms')
    if (!idiomNode) {
      idiomNode = node.querySelector('.xref.idiom')
    }

    if (idiomNode) {
      const itemNodes = idiomNode.querySelectorAll('.item')
      for (let l = 0; l < itemNodes.length; l++) {
        entry.idioms.push(itemNodes[l].innerText)
      }

      if (entry.idioms.length > 0) {
        logger.info(`Found ${entry.idioms.length} idioms of word ${word}`)
      }
    }

    let phraseVerbNode = node.querySelector('.xref.phrasal_verbs')
    if (!phraseVerbNode) {
      phraseVerbNode = node.querySelector('.xref.phrasal_verb')
    }

    if (phraseVerbNode) {
      const itemNodes = phraseVerbNode.querySelectorAll('.item')
      for (let l = 0; l < itemNodes.length; l++) {
        entry.verb_phrases.push(itemNodes[l].innerText)
      }

      if (entry.verb_phrases.length > 0) {
        logger.info(
          `Found ${entry.verb_phrases.length} phrasal verbs of word ${word}`
        )
      }
    }

    if (entry.defs.length > 0) {
      data.entries.push(entry)
    }
  }

  return data
}

async function scan(apiUrl, outFile) {
  const words = await readWords(WORDS_FILE)
  logger.info(`Found ${words.length} words`)

  const parsedLemmas = await readJson(outFile)

  await lookup(apiUrl, words, outFile, parsedLemmas.length)
  logger.info('DONE!')
}

async function scanWordForms(apiUrl, inputFile, outFile) {
  const words = await readJson(inputFile)

  logger.info(`Found ${words.length} input words`)
  const parsedLemmas = await readJson(outFile)
  logger.info(`Found ${words.length} parsed words`)

  await lookupWordForm(apiUrl, words, outFile, parsedLemmas.length)
  logger.info('DONE!')
}

const apiUrl_Vn =
  'https://dictionary.cambridge.org/vi/dictionary/english-vietnamese/'

const apiUrl_En = 'https://dictionary.cambridge.org/dictionary/english/'

const enFile = './out/lemmas_cambridge_en.json'
const vnFile = './out/lemmas_cambridge_vn.json'

/**
 * Main function:
 *
 */

//await scan(apiUrl_En, enFile);
/**
 * End main function!
 */

/**
 * Fixed dupplicate result file
 *
 */
async function removeDupplicate(file) {
  const parsedLemmas = await readJson(file)

  const uniques = []
  const set = new Set()
  const removed = []

  for (let i = 0; i < parsedLemmas.length; i++) {
    if (!set.has(parsedLemmas[i].lemma)) {
      uniques.push(parsedLemmas[i])
      set.add(parsedLemmas[i].lemma)
    } else {
      removed.push(parsedLemmas[i])
    }
  }
  console.log(`Removed ${parsedLemmas.length - uniques.length} dupplicate`)

  Deno.writeTextFileSync('./out/uniques.json', JSON.stringify(uniques))

  Deno.writeTextFileSync('./out/removed.json', JSON.stringify(removed))
}

//await removeDupplicate(enFile);

//await scanWordForms(apiUrl_En, enFile, "./out/lemmas_wordforms_en.json");

//Process the result:
async function analyze(resultFile) {
  console.log(`Analyzing file ${resultFile}`)

  const words = await readJson(resultFile)
  console.log(`Loaded ${words.length} words`)

  let lemma
  const lemmaMap = {}
  const wordFormMap = {}
  const entries = []
  const combined = {}
  let wordForms
  let defCount = 0
  let combinedCnt = 0

  let lemmaEntryCnt = 0
  let wordFormEntryCnt = 0
  let hasEntryCnt = 0

  let wordFormCounted
  for (let i = 0; i < words.length; i++) {
    lemma = words[i]
    wordFormCounted = false

    if (lemma.data) {
      if (lemma.data.entries.length > 0) {
        hasEntryCnt++
        lemmaMap[lemma.lemma] = lemma.data
        entries.push(...lemma.data.entries)
      }
      //Main lemma entry
      lemmaEntryCnt = lemmaEntryCnt + lemma.data.entries.length
      try {
        for (let j = 0; j < lemma.data.entries.length; j++) {
          defCount = defCount + lemma.data.entries[j].defs.length
        }
      } catch (err) {
        console.warn(`Error occured: "${err.message}". Lemma:`, lemma.data)
        break
      }
    }

    if (lemma.word_forms_data?.length > 0) {
      //Word form entries
      wordForms = lemma.word_forms_data
      try {
        for (let j = 0; j < wordForms.length; j++) {
          if (wordFormMap[wordForms[j].vocab]) {
            combinedCnt++
            if (combined[wordForms[j].vocab]) {
              combined[wordForms[j].vocab].push(wordForms[j])
            } else {
              combined[wordForms[j].vocab] = [wordForms[j]]
            }
          } else if (wordForms[j].entries.length > 0) {
            wordFormMap[wordForms[j].vocab] = wordForms[j]
            combined[wordForms[j].vocab] = [wordForms[j]]

            entries.push(...wordForms[j].entries)

            for (let k = 0; k < wordForms[j].entries.length; k++) {
              defCount = defCount + wordForms[j].entries[k].defs.length
            }

            wordFormEntryCnt += wordForms[j].entries.length

            if (!wordFormCounted && wordForms[j].entries.length > 0) {
              hasEntryCnt++
              wordFormCounted = true
            }
          }
        }
      } catch (err) {
        console.warn(
          `Error occured: "${err.message}". Lemma word forms:`,
          wordForms
        )
        break
      }
    }
  }

  const keyEntries =
    Object.keys(wordFormMap).length + Object.keys(lemmaMap).length

  console.log(
    `Found total ${
      entries.length
    } entries and ${defCount} definitions. Combined word forms count ${combinedCnt}. Lemma entries: ${lemmaEntryCnt}, word form entries: ${wordFormEntryCnt}. Distinct vocabs: ${hasEntryCnt}, keys lemma count: ${
      Object.keys(lemmaMap).length
    }, key word forms count: ${
      Object.keys(wordFormMap).length
    }, total: ${keyEntries}`
  )

  Deno.writeTextFileSync('./combined_word_forms.json', JSON.stringify(combined))
}

await analyze('./out/lemmas_wordforms_en.json')

//await analyze("lemmas_cambridge_en.json");

//TEST ...................................

//const testTxt = await Deno.readTextFile("./out/testData.json");
//const testHtml = JSON.parse(testTxt)[0].data;
//console.log(testHtml);

//const parseResult = parseEnData(testHtml, "be");

//console.log(parseResult);

//Deno.writeTextFileSync("./out/testDataResult.json", JSON.stringify(parseResult));
//............................... END TEST
