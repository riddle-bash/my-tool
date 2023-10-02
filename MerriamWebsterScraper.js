import { log } from "./deps.ts";
import { DOMParser } from "https://esm.sh/linkedom";
import { sleepRandomAmountOfSeconds } from "https://deno.land/x/sleep/mod.ts";

const WORDS_FILE = "./cambridge.json";
const filePath = "meriam.json";
// Deno.writeTextFileSync("meriam.json", JSON.stringify(dataF));

const POS_MAP = {
  noun: "n",
  adjective: "adj",
  verb: "v",
  adverb: "adv",
  preposition: "prep",
  pronoun: "pron",
  conjunction: "conj",
  aux: "aux",
  auxiliary: "aux",
  idiom: "idm",
  exclamation: "exc",
  determiner: "det",
};

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
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

async function lookup(apiUrl, words, startIndex) {
  let url;
  let response;
  let data;
  let wordScanCnt = 0;
  let html;
  let content;
  let writeTextCnt = 0;
  const parser = new DOMParser();

  let currWord = startIndex;
  const dataResult = [];

  for (let i = startIndex; i < words.length; i++) {
    const word = words[i].vocab;
    let defResult = [];

    try {
      url = `${apiUrl}${word}`;
      response = await fetch(url, {
        "Content-Type": "text/html",
      });
      data = await response.text();
      html = parser.parseFromString(data, "text/html");
      content = html.getElementById("left-content");
      if (content) {
        const wordSection = content.querySelectorAll(
          ".entry-word-section-container"
        );

        wordSection.forEach((item) => {
          const posItem = item.querySelector(".parts-of-speech");
          const posText = posItem?.textContent.trim();
          const defBody = item.querySelectorAll(".dt");

          for (let j = 0; j < wordSection.length; j++) {
            const defObj = {};
            const expArr = [];
            const defItem = defBody[j]?.querySelector(".dtText");
            const exampleItem = defBody[j]?.querySelector(".ex-sent.sents");
            const specialCaseExpItem = content?.querySelectorAll(".t.has-aq");

            const defText = defItem?.textContent.trim();
            let exampleText;
            if (exampleItem) {
              exampleText = exampleItem.textContent.trim();
              expArr.push(exampleText);
            } else if (specialCaseExpItem) {
              specialCaseExpItem.forEach((item) =>
                expArr.push(item.textContent.trim())
              );
            } else {
              exampleText = null;
            }
            defObj.def = defText;
            defObj.exp = expArr;
            defObj.pos = posText;
            defResult.push(defObj);
          }
        });
        wordScanCnt++;
        currWord++;
      }
    } catch (err) {
      defResult = null;
      wordScanCnt++;
      currWord++;
      logger.warning(err);
    }
    dataResult.push({ vocab: word, def: defResult });
    if (
      wordScanCnt === 1000 ||
      wordScanCnt === words.length - 1000 * writeTextCnt
    ) {
      const jsonDataAfterWrite = await Deno.readTextFile(filePath);
      if (jsonDataAfterWrite) {
        if (currWord > JSON.parse(jsonDataAfterWrite).length) {
          const file = await Deno.open(filePath, {
            read: true,
            write: true,
          });

          const currentSize = (await Deno.stat(filePath)).size;

          const keepSize = currentSize - 1;

          await Deno.truncate(filePath, keepSize);

          file.close();
          Deno.writeTextFileSync(filePath, `,`, {
            append: true,
          });
          const newDataResult = JSON.stringify(dataResult).slice(1);
          Deno.writeTextFileSync(filePath, newDataResult, {
            append: true,
          });
        }
      } else {
        Deno.writeTextFileSync(filePath, JSON.stringify(dataResult), {
          append: true,
        });
      }
      writeTextCnt++;
      wordScanCnt = 0;
      dataResult.splice(0);
      console.log(currWord);
    }
  }
}

const apiUrl = "https://www.merriam-webster.com/dictionary/";

async function scan() {
  const file = await Deno.readTextFileSync(WORDS_FILE);
  const words = JSON.parse(file).filter((item) => item.def === null);
  if (await exists(filePath)) {
    const parsedData = await Deno.readTextFile(filePath);
    const currLength = parsedData ? JSON.parse(parsedData).length : 0;
    await lookup(apiUrl, words, currLength);
  } else {
    Deno.writeTextFileSync(filePath);
    await lookup(apiUrl, words, 0);
  }

  logger.info("DONE!");
}

scan();

const exists = async (filename) => {
  try {
    await Deno.stat(filename);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw error;
    }
  }
};
