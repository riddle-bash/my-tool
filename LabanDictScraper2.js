import { log } from "./deps.ts";
import { DOMParser } from "https://esm.sh/linkedom";

const WORDS_FILE = "./in/test.txt";
const filePath = "./laban.json";

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
  let html;
  const parser = new DOMParser();
  let content;
  let writeTextCnt = 0;

  const jsonFile = await Deno.readTextFile(filePath);
  const currLength = jsonFile ? JSON.parse(jsonFile).length : 0;
  let currWord = currLength;
  const dataResult = [];

  try {
    url = `${api}"chances"`;
    response = await fetch(url);
    data = await response.json();
    const dataHtml = data.enViData.best.details;
    const html = parser.parseFromString(dataHtml, "text/html");
    const content = html.querySelectorAll("#content_selectable > div");

    const result = {};
    const posArr = [];

    for (let i = 0; i < content.length; i++) {
      const posClass = content[i].getAttribute("class");
      if (posClass === "bg-grey bold font-large m-top20") {
        const posContent = content[i].textContent;
        posArr.push({ indx: i, value: posContent });
      }
    }

    for (let k = 0; k < content.length; k++) {
      const defClass = content[k].getAttribute("class");
      if (
        posArr[0].indx < k &&
        posArr[1].indx > k &&
        defClass === "green margin25 m-top15"
      ) {
        const defContent = content[k].textContent;

        result.vocab = "chances";
      } else if (posArr[1].indx > k && defClass === "green margin25 m-top15") {
        const defContent = content[k].textContent;
        result.push(defContent);
      }
    }
    console.log(result);
    // console.log(posArr);
    // for (let i = 0; i < listPos.length; i++) {
    //   console.log(listPos[i].textContent);
    // }
    // Deno.writeTextFileSync(filePath, x);
  } catch (err) {
    logger.warning(err);
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

// const parsedData = await Deno.readTextFile(filePath);
// const currLength = JSON.parse(parsedData).length;
// console.log(currLength);
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
