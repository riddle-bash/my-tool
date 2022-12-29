import { fs } from "./deps.ts";
import { path } from "./deps.ts";
import { log } from "./deps.ts";
import { download } from "./deps.ts";
import { postgres } from "./deps.ts";

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
      filename: `./laban.log`,
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

const lemmas = await readLemmas(LEMMAS_FILE);
logger.info(`Found ${lemmas.length} lemmas`);

console.log(lemmas.slice(0, 5));
