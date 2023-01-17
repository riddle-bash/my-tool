import { fs } from "./deps.ts";
import { path } from "./deps.ts";
import { log } from "./deps.ts";
import { download } from "./deps.ts";
import { sleepRandomAmountOfSeconds } from "https://deno.land/x/sleep/mod.ts";
import { postgres } from "./deps.ts";
import { DOMParser } from "https://esm.sh/linkedom";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs";

/**
 * 1. Scan root folder recursively to find all vocabulary subfolder and json/sound/image files.
 * 2. For each leaf folder, open json file, parse and convert to new format json file.
 * 3. Restructure folder hiarachy to store "new" vocab folder.
 * 4. Insert json vocab to Postgres database.
 */

const LEMMAS_FILE = "C:/Users/thangqm/My Workspace/AzVocab/Lemmas.txt";

/**
 * Init logger
 */
await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG"),

    file: new log.handlers.FileHandler("INFO", {
      filename: `./cambridge_scraper.log`,
      // you can change format of output message using any keys in `LogRecord`.
      //formatter: "{datetime} {levelName} {msg}",
      formatter: (logRecord) => {
        const options = {
          year: "2-digit",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Ho_Chi_Minh",
        };

        const fmt = new Intl.DateTimeFormat("vi-VN", options);
        let msg = `${fmt.format(logRecord.datetime)} ${logRecord.levelName} ${
          logRecord.msg
        }`;

        logRecord.args.forEach((arg, index) => {
          msg += `, arg${index}: ${arg}`;
        });

        return msg;
      },
    }),
  },

  loggers: {
    // configure default logger available via short-hand methods above.
    default: {
      level: "DEBUG",
      handlers: ["console", "file"],
    },
  },
});

//Get default logger
const logger = log.getLogger();

async function readLemmas(file) {
  const lemmas = new Set();

  try {
    const texts = await Deno.readTextFile(file);
    const lines = texts.split("\n");
    logger.info(`Loaded ${lines.length} line of file ${file}`);
    let lmCnt = 0;
    let noWordFormCnt = 0;
    let noRankCnt = 0;
    let totalWordCnt = 0;
    lines.forEach((line) => {
      let arr = line
        .split("->")
        .map((txt) => txt.trim())
        .filter((txt) => txt.length > 0);
      if (arr.length > 0) {
        const lm = {};
        //left => lemma, right => word forms
        if (arr[0]) {
          let left = arr[0]
            .split("/")
            .map((txt) => txt.trim())
            .filter((txt) => txt.length > 0);

          if (left[0]) {
            lmCnt++;
            totalWordCnt++;

            lm.lemma = left[0];

            lemmas.add(lm);
          }

          if (left[1]) {
            lm.rank = left[1];
          } else {
            noRankCnt++;
          }
        }

        if (arr[1]) {
          let right = arr[1]
            .split(",")
            .map((txt) => txt.trim())
            .filter((txt) => txt.length > 0);
          lm.word_forms = right;
          if (right.length === 0) {
            noWordFormCnt++;
          } else {
            totalWordCnt += right.length;
          }
        } else {
          noWordFormCnt++;
          logger.warning(`No word form, line: "${line}"`);
        }
      }
    });

    logger.info(
      `Lemma count: ${lmCnt}, total words count: ${totalWordCnt} no rank count: ${noRankCnt}, no word forms count: ${noWordFormCnt}`
    );
  } catch (err) {
    logger.warning(`Read lemmas file ${file} error: ${err.message}`);
  }

  return [...lemmas];
}

async function readLemmaJson(file) {
  try {
    const texts = await Deno.readTextFile(file);
    const json = JSON.parse(texts);
    logger.info(`Loaded ${json.length} lemmas of file ${file}`);
    return json;
  } catch (err) {
    logger.warning(`Read lemmas file ${file} error: ${err.message}`);
  }

  return [];
}

async function lookup(apiUrl, lemmas, outputFile) {
  logger.info(`Begining scan ${apiUrl} ...`);

  let url;
  let lemma;
  let response;
  let data;
  const length = lemmas.length;
  //const length = 3;
  const results = new Set();

  let rs;
  let html;
  let content;
  let entryCnt = 0;
  let dataCount = 0;
  const parser = new DOMParser();
  let written = false;
  let parentClass;
  Deno.writeTextFileSync(outputFile, "[");
  for (let i = 0; i < length; i++) {
    lemma = lemmas[i];
    rs = Object.assign({}, lemma);
    if (!rs.data) {
      entryCnt++;
      url = `${apiUrl}${lemma.lemma}`;
      try {
        response = await fetch(url, {
          "Content-Type": "text/html",
        });

        data = await response.text();
        html = parser.parseFromString(data);
        content = html.getElementById("page-content");
        if (content) {
          outer: for (let j = 0; j < content.childNodes.length; j++) {
            parentClass = content.childNodes[j].className;
            if (parentClass === "entry-body") {
              //console.log("Found entry-body class ...");
              //Cambridge Vietnamese
              let node = content.childNodes[j];
              for (let k = 0; k < node.childNodes.length; k++) {
                if (node.childNodes[k].className === "pr dictionary") {
                  let child = node.childNodes[k];
                  //Only get first definition set
                  for (let t = 0; t < child.childNodes.length; t++) {
                    if (child.childNodes[t].className === "link dlink") {
                      dataCount++;
                      rs.data = child.childNodes[t].innerHTML;
                      break outer;
                    }
                  }
                }
              }
            } else if (parentClass === "page") {
              //console.log("Found page class ...");
              //Cambridge English
              let node = content.childNodes[j];
              for (let k = 0; k < node.childNodes.length; k++) {
                // console.log(
                //   `Node: ${k}/${node.childNodes.length}, class: ${node.childNodes[k].className}`
                // );
                if (node.childNodes[k].className === "pr dictionary") {
                  let child = node.childNodes[k];
                  //Only get first definition set
                  for (let t = 0; t < child.childNodes.length; t++) {
                    // console.log(
                    //   `Node: ${t}/${child.childNodes.length}, class: ${child.childNodes[t].className}`
                    // );
                    if (child.childNodes[t].className === "link") {
                      dataCount++;
                      rs.data = child.childNodes[t].innerHTML;
                      break outer;
                    }
                  }
                }
              }
            }
          }
        } else {
          logger.warning(`Not found page-content of lemma ${lemma.lemma}`);
        }
        //console.log(data);
      } catch (err) {
        console.warn("Error: ", err);
        rs.error = { code: 9999, message: err.message };
      }

      await sleepRandomAmountOfSeconds(0.5, 1, true);
    }

    results.add(rs);

    if (entryCnt > 0 && entryCnt % 100 === 0 && results.size > 0) {
      console.log(
        `Scanned ${entryCnt}/${length} lemmas, data count: ${dataCount}`
      );
      const batch = JSON.stringify([...results]);

      if (!written) {
        Deno.writeTextFileSync(outputFile, ",", {
          append: true,
        });
      }

      Deno.writeTextFileSync(outputFile, batch.substring(1, batch.length - 1), {
        append: true,
      });

      written = true;
      results.clear();
    }
  }

  if (results.size > 0) {
    if (written) {
      Deno.writeTextFileSync(outputFile, ",", {
        append: true,
      });
    }

    const batch = JSON.stringify([...results]);

    Deno.writeTextFileSync(outputFile, batch.substring(1, batch.length - 1), {
      append: true,
    });
  }

  Deno.writeTextFileSync(outputFile, "]", {
    append: true,
  });

  logger.info(
    `Scanned total ${entryCnt}/${length} lemmas, data count: ${dataCount}`
  );
}

const apiUrl_Vn =
  "https://dictionary.cambridge.org/vi/dictionary/english-vietnamese/";

const apiUrl_En = "https://dictionary.cambridge.org/dictionary/english/";

const lemmas = await readLemmas(LEMMAS_FILE);
logger.info(`Found ${lemmas.length} lemmas`);

//await lookup(apiUrl_Vn, lemmas, "./lemmas_cambridge_vn.json");
await lookup(apiUrl_En, lemmas, "./lemmas_cambridge_en.json");

/**
 * RESCAN
 * Use when rescan
 */
// const JSON_FILE =
//   "C:/Users/thangqm/My Workspace/cth-azvocab-tool/lemmas_cambridge_vn.json";

// const lemmas = await readLemmaJson(JSON_FILE);
// await lookup(apiUrl, lemmas, "./lemmas_cambridge_vn_2.json");
/**
 * END RESCAN
 */

logger.info("DONE!");
