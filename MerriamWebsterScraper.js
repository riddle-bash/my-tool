import { log } from "./deps.ts";
import { DOMParser } from "https://esm.sh/linkedom";
import { sleepRandomAmountOfSeconds } from "https://deno.land/x/sleep/mod.ts";

const WORDS_FILE = "./cambridge4.json";
const filePath = "meriam2.json";
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
  const dataResult = [];

  let currWord = startIndex;

  for (let i = startIndex; i < words.length; i++) {
    const word = words[i].vocab;
    let defResult = [];
    let dataObj = {};
    const thesaurus = await getThesaurus(word);
    try {
      url = `${apiUrl}${word}`;
      response = await fetch(url, {
        "Content-Type": "text/html",
      });
      data = await response.text();
      html = parser.parseFromString(data, "text/html");
      content = html.getElementById("left-content");

      // happens when there are cases where the search does not yield the correct type of word I am looking for
      const hasSingleDef = html.querySelectorAll(".entry-uros");

      hasSingleDef?.forEach((item) => {
        const uroBody = item.querySelectorAll(".uro");
        let wordName;

        uroBody?.forEach((uro) => {
          wordName = uro.querySelector(".fw-bold.ure");
          if (
            wordName?.textContent.trim().toLowerCase().replace(/-/g, "") ===
            word
          ) {
            const defObj = {};
            const expArr = [];
            const expBody = item.querySelector(".ex-sent.sents");
            const posBody = item.querySelector(".fw-bold.fl");
            const posText = posBody?.textContent.trim();
            const defText = "";
            const expText = expBody?.textContent.trim();
            const pronun = item.querySelector(".prons-entry-list-item");
            if (expText) expArr.push(expText);
            // expBody?.forEach((item) => {
            //   const expText = item.textContent.trim();
            //   expArr.push(expText);
            // });
            const synonyms =
              thesaurus?.synonyms?.length > 0 &&
              thesaurus.synonyms.find(
                (item) => item?.pos?.trim().toLowerCase() === posText
              );
            const antonyms =
              thesaurus?.antonyms?.length > 0 &&
              thesaurus.antonyms.find(
                (item) => item?.pos?.trim().toLowerCase() === posText
              );

            let pronunCaseText;
            if (pronun) {
              pronunCaseText = pronun?.textContent
                .trim()
                .replace(/[\n\s]+/g, ",")
                .trim();
            }
            defObj.def = defText;
            defObj.exp = expArr;
            defObj.pronunciation = pronunCaseText;
            defObj.pos = posText;
            defObj.synonyms = synonyms?.synonyms ? synonyms.synonyms : [];
            defObj.antonyms = antonyms?.antonyms ? antonyms.antonyms : [];

            defResult.push(defObj);
          }
        });
      });

      if (content) {
        const wordSection = content.querySelectorAll(
          ".entry-word-section-container"
        );

        wordSection.forEach((item) => {
          const posItem = item.querySelector(".parts-of-speech");
          const posText = posItem?.textContent.trim();
          const defBody = item.querySelectorAll(".dt");
          const isWord = item.querySelector(".hword");
          const pronun = item.querySelector(".prons-entry-list-item");

          // console.log(isWord.textContent.trim());
          if (
            isWord?.textContent.trim().toLowerCase().replace(/-/g, "") === word
          ) {
            for (let j = 0; j < wordSection.length; j++) {
              const defObj = {};
              const expArr = [];
              const synonyms = [];

              const expBody = content.querySelector("#examples");
              const defItem = defBody[j]?.querySelector(".dtText");
              const exampleItem =
                defBody[j]?.querySelectorAll(".ex-sent.sents");
              const strongDef = defItem?.querySelectorAll("strong");

              const specialCaseExpItem = expBody?.querySelectorAll(".t");
              let defText;
              if (defItem) {
                // Clone the element to avoid modifying the original DOM structure
                const dtTextClone = defItem.cloneNode(true);

                // Remove the <a> element and its content

                if (strongDef.length > 1) {
                  const aElement = dtTextClone.querySelector("a");
                  if (aElement) {
                    aElement.parentNode.removeChild(aElement);
                  }
                }
                const removeEl = dtTextClone.querySelector(".dx-jump");
                if (removeEl) {
                  removeEl.parentNode.removeChild(removeEl);
                }

                // Get the text content of the modified element
                defText = dtTextClone?.textContent
                  .trim()
                  .replace(/:/g, "")
                  .trim();
              }

              let pronunText;
              if (pronun) {
                pronunText = pronun?.textContent
                  .trim()
                  .replace(/[\n\s]+/g, ",")
                  .trim();
              }

              if (word === "abba") {
                const unText = item.querySelector(".unText");
                if (defText !== undefined) {
                  defText = defText + ":" + unText?.textContent.trim();
                } else {
                  defText = "";
                }
              }

              let exampleText;
              if (
                expBody
                  ?.querySelector(".content-section-header")
                  ?.textContent.trim() ===
                  `Examples of ${word} in a Sentence` &&
                !expBody?.querySelector(".on-web-container")
              ) {
                const expPos = expBody.querySelectorAll(
                  ".ex-header.function-label.content-section-sub-header"
                );
                expPos.forEach((item) => {
                  if (posText === item.textContent.trim().toLowerCase()) {
                    exampleText = item.nextElementSibling.textContent.trim();
                    exampleText && expArr.push(exampleText);
                  }
                });
              } else if (specialCaseExpItem) {
                specialCaseExpItem.forEach((item) => {
                  exampleText = item.textContent.trim();
                  exampleText && expArr.push(exampleText);
                });
              } else if (exampleItem) {
                exampleItem.forEach((item) => {
                  exampleText = item.textContent.trim();
                  exampleText && expArr.push(exampleText);
                });
              }

              if ((defText && posText) || expArr.length > 0) {
                const synonyms =
                  thesaurus?.synonyms?.length > 0 &&
                  thesaurus.synonyms.find(
                    (item) => item?.pos?.trim().toLowerCase() === posText
                  );
                const antonyms =
                  thesaurus?.antonyms?.length > 0 &&
                  thesaurus.antonyms.find(
                    (item) => item?.pos?.trim().toLowerCase() === posText
                  );

                defObj.def = defText;
                defObj.exp = expArr;
                defObj.pronunciation = pronunText;
                defObj.pos = posText;
                defObj.synonyms = synonyms?.synonyms ? synonyms.synonyms : [];
                defObj.antonyms = antonyms?.antonyms ? antonyms.antonyms : [];

                defResult.push(defObj);
              }
            }
          }

          const hasSingleDef = html.querySelectorAll(".entry-uros");
          // console.log(hasSingleDef.length, " ", word);

          if (hasSingleDef.length > 0) {
            hasSingleDef.forEach((item) => {
              const uroBody = item.querySelectorAll(".uro");
              let wordName;

              uroBody?.forEach((uro) => {
                wordName = uro.querySelector(".fw-bold.ure");
                if (
                  (wordName?.textContent
                    .trim()
                    .toLowerCase()
                    .replace(/-/g, "") === word &&
                    posText) ||
                  (isWord?.textContent
                    .trim()
                    .toLowerCase()
                    .replace(/-/g, "") === word &&
                    posText)
                ) {
                  dataObj.vocab = word;
                  dataObj.def = defResult;
                } else if (
                  wordName?.textContent
                    .trim()
                    .toLowerCase()
                    .replace(/-/g, "") === word
                ) {
                  dataObj.vocab = word;
                  dataObj.def = defResult;
                }
              });
            });
          } else {
            if (
              isWord?.textContent.trim().toLowerCase().replace(/-/g, "") ===
                word &&
              posText
            ) {
              dataObj.vocab = word;
              dataObj.def = defResult;
            } else {
              dataObj.vocab = word;
              dataObj.def = defResult;
            }
          }
        });

        // if (word === "abecedarian") {
        //   console.log(dataObj);
        // }
        dataResult.push(dataObj);
        wordScanCnt++;
        currWord++;
      }
    } catch (err) {
      defResult = null;
      wordScanCnt++;
      currWord++;
      logger.warning(err);
    }

    if (
      wordScanCnt === 500 ||
      wordScanCnt === words.length - 500 * writeTextCnt
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
  const words = JSON.parse(file).filter(
    (item) => item?.def === null || item?.def?.length === 0
  );
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

const thesaurusAPI = "https://www.merriam-webster.com/thesaurus/";

async function getThesaurus(word) {
  let url;
  let response;
  let data;
  let html;

  let content;
  const parser = new DOMParser();
  const result = { synonyms: [], antonyms: [] };

  try {
    url = `${thesaurusAPI}${word}`;
    response = await fetch(url, {
      "Content-Type": "text/html",
    });
    data = await response.text();
    html = parser.parseFromString(data, "text/html");
    content = html.getElementById("left-content");

    if (content) {
      const thesaurusBody = content.querySelectorAll(
        ".entry-word-section-container"
      );

      thesaurusBody.forEach((item) => {
        const synObj = {};
        const synArr = [];
        const antObj = {};
        const antArr = [];
        const posNode = item.querySelector(".parts-of-speech");
        const postText = posNode.textContent.trim();

        const synonymsNode = item.querySelector(".thes-list.sim-list-scored");
        const synonymListNode = synonymsNode.querySelector(
          ".thes-list-content.synonyms_list"
        );
        const synonymList = synonymListNode.querySelectorAll("li");
        synonymList.forEach((li) => {
          const synText = li.textContent.trim();
          synArr.push(synText);
        });

        const antoNode = item.querySelector(".thes-list.opp-list-scored");
        const antoListNode = antoNode?.querySelector(
          ".thes-list-content.synonyms_list"
        );
        const antoList = antoListNode?.querySelectorAll("li");
        antoList?.forEach((li) => {
          const antText = li.textContent.trim();
          antArr.push(antText);
        });

        synObj.pos = postText;
        synObj.synonyms = synArr;

        antObj.pos = postText;
        antObj.antonyms = antArr;

        result.synonyms.push(synObj);
        result.antonyms.push(antObj);
      });
    }

    return result;
  } catch (err) {
    logger.warning(err);
  }
  return result;
}
