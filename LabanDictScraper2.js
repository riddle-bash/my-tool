import { log } from "./deps.ts";
import { DOMParser } from "https://esm.sh/linkedom";
import { sleepRandomAmountOfSeconds } from "https://deno.land/x/sleep/mod.ts";
const WORDS_FILE = "./in/get_df_1.txt";
const filePath = "./laban1.json";

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

async function lookup(words, startIndex) {
  const api = "https://dict.laban.vn/ajax/find?type=1&query=";
  let url;
  let response;
  let data;
  let wordScanCnt = 0;

  const parser = new DOMParser();
  let writeTextCnt = 0;

  const jsonFile = await Deno.readTextFile(filePath);
  const currLength = jsonFile ? JSON.parse(jsonFile).length : 0;
  let currWord = currLength;
  const dataResult = [];

  for (let i = startIndex; i < words.length; i++) {
    const word = words[i];
    try {
      url = `${api}${word}`;
      response = await fetch(url);
      data = await response.json();
      const dataHtml = data?.enViData?.best?.details;
      const html = parser.parseFromString(dataHtml, "text/html");
      const content = html.querySelectorAll("#content_selectable > div");

      const result = {};
      const posArr = [];

      for (let k = 0; k < content.length; k++) {
        const posClass = content[k].getAttribute("class");
        if (posClass === "bg-grey bold font-large m-top20") {
          const posContent = content[k].textContent;
          posArr.push({ indx: k, value: posContent });
          result[posContent] = [];
        }
      }

      for (let k = 0; k < content.length; k++) {
        const defClass = content[k].getAttribute("class");
        for (let j = 0; j < posArr.length; j++) {
          const posItem = posArr[j];

          if (
            j + 1 === posArr.length &&
            k >= posItem.indx &&
            defClass === "green margin25 m-top15"
          ) {
            const defContent = content[k].textContent;
            result[posItem.value].push(defContent);
          } else if (
            defClass === "green margin25 m-top15" &&
            k > posItem.indx &&
            k < posArr[j + 1].indx
          ) {
            const defContent = content[k].textContent;
            result[posItem.value].push(defContent);
          }
        }
      }

      const def = [];
      const resultConvert = Object.entries(result);
      for (let k = 0; k < resultConvert.length; k++) {
        const pos = resultConvert[k][0];
        const defList = resultConvert[k][1];
        defList.forEach((item) => {
          const obj = { pos, def: item };
          def.push(obj);
        });
      }

      dataResult.push({ vocab: word, def: def });
      wordScanCnt++;
      currWord++;
    } catch (err) {
      dataResult.push({ vocab: word, def: null });
      wordScanCnt++;
      currWord++;
      // logger.warning(err);
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
}

async function scan() {
  const words = await readWords(WORDS_FILE);
  if (await exists(filePath)) {
    const parsedData = await Deno.readTextFile(filePath);
    const currLength = parsedData ? JSON.parse(parsedData).length : 0;
    await lookup(words, currLength);
  } else {
    Deno.writeTextFileSync(filePath);
    await lookup(words, 0);
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
