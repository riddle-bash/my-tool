import { log } from "./deps.ts";
import { DOMParser } from "https://esm.sh/linkedom";
import { sleepRandomAmountOfSeconds } from "https://deno.land/x/sleep/mod.ts";

const WORDS_FILE = "./in/get_df_1.txt";
const MEDIA_URL = "https://dictionary.cambridge.org";
const filePath = "./cambridge.json";

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

async function readWords(file) {
  const words = new Set();
  try {
    const texts = await Deno.readTextFile(file);
    const lines = texts.split("\n").map((txt) => txt.trim());
    let wordCnt = 0;
    lines.forEach((line) => {
      if (line.length > 0) {
        wordCnt++;
        words.add(line);
      }
    });
  } catch (error) {
    logger.warning(error);
  }
  return [...words];
}

async function lookup(apiUrl, words, startIndex) {
  let url;
  let response;
  let data;
  let wordScanCnt = 0;
  let html;
  let content;
  let writeTextCnt = 0;
  const parser = new DOMParser();
  const jsonFile = await Deno.readTextFile(filePath);
  const currLength = jsonFile ? JSON.parse(jsonFile).length : 0;
  let currWord = currLength;
  const dataResult = [];

  for (let i = startIndex; i < words.length; i++) {
    const word = words[i];
    const dataObj = {};

    try {
      url = `${apiUrl}${word}`;
      response = await fetch(url, {
        "Content-Type": "text/html",
      });
      data = await response.text();
      html = parser.parseFromString(data, "text/html");
      content = html.getElementById("page-content");

      if (content) {
        const defbody = content.querySelectorAll(".pr.dsense ");
        const posBody = content.querySelector(".pos.dpos");
        const ukBody = content.querySelector(".uk.dpron-i");
        const usBody = content.querySelector(".us.dpron-i");

        const def = [];
        const pronounce = { us: {}, uk: {} };

        defbody.forEach((el) => {
          const defination = el.querySelectorAll(".def.ddef_d.db");
          const defBlock = el.querySelectorAll(".def-block.ddef_block");

          const cefr = el.querySelectorAll(".def-info.ddef-info");
          const pos = el.querySelector(".pos.dsense_pos");
          for (let k = 0; k < defination.length; k++) {
            const definitionText = defination[k]?.textContent
              .replace(/\n\s*/g, " ")
              .trim();
            const cefrText = cefr[k]?.textContent.trim();
            const cefrTextFormat = CEFR.find((item) =>
              cefrText?.includes(item)
            );
            const posTextContent = pos?.textContent.trim();
            const example = defBlock[k]?.querySelectorAll(".examp.dexamp");

            let expText = [];
            let posText;
            if (posTextContent) {
              posText = posTextContent.toLowerCase();
            } else {
              posText = posBody?.textContent.trim().toLowerCase();
            }

            if (POS_MAP.hasOwnProperty(posText)) {
              posText = POS_MAP[posText];
            }

            for (let j = 0; j < example?.length; j++) {
              expText.push(example[j]?.textContent.trim());
            }
            def.push({
              def: definitionText ? definitionText : "",
              cefr: cefrTextFormat ? cefrTextFormat : "",
              pos: posText,
              exp: expText ? expText : [],
            });
          }
        });
        let srcValueUK = "";
        let pronunciationValueUK = "";
        if (ukBody) {
          const pronSoundElementUK = ukBody.querySelector("audio source");
          const pronunciationElementUK = ukBody.querySelector(".pron.dpron");
          if (pronSoundElementUK)
            srcValueUK = pronSoundElementUK.getAttribute("src");
          if (pronunciationElementUK)
            pronunciationValueUK = pronunciationElementUK.textContent.trim();
          pronounce.uk.sound = MEDIA_URL + srcValueUK;
          pronounce.uk.pronunciation = pronunciationValueUK;
        } else {
          pronounce.uk.sound = srcValueUK;
          pronounce.uk.pronunciation = pronunciationValueUK;
        }

        let srcValueUS = "";
        let pronunciationValueUS = "";
        if (usBody) {
          const pronSoundElementUS = usBody.querySelector("audio source");
          const pronunciationElementUS = usBody.querySelector(".pron.dpron");

          if (pronSoundElementUS)
            srcValueUS = pronSoundElementUS.getAttribute("src");
          if (pronunciationElementUS)
            pronunciationValueUS = pronunciationElementUS.textContent.trim();

          pronounce.us.sound = MEDIA_URL + srcValueUS;
          pronounce.us.pronunciation = pronunciationValueUS;
        } else {
          pronounce.us.sound = srcValueUS;
          pronounce.us.pronunciation = pronunciationValueUS;
        }

        dataObj.vocab = word;
        dataObj.def = def;
        dataObj.pronounce = pronounce;
        dataResult.push(dataObj);
      } else {
        dataObj.vocab = word;
        dataObj.def = null;
        dataObj.pronounce = null;
        dataResult.push(dataObj);
      }
      wordScanCnt++;
      currWord++;
    } catch (err) {
      dataObj.vocab = word;
      dataObj.def = null;
      dataObj.pronounce = null;
      dataResult.push(dataObj);
      wordScanCnt++;
      currWord++;
      logger.warning(err);
    }

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
  logger.info(currLength);
}

const apiUrl = "https://dictionary.cambridge.org/dictionary/english/";

async function scan() {
  const words = await readWords(WORDS_FILE);
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
