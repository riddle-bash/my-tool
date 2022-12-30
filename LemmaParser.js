import { fs } from "./deps.ts";
import { path } from "./deps.ts";
import { log } from "./deps.ts";
import { DOMParser } from "https://esm.sh/linkedom";
import { postgres } from "./deps.ts";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs";

/**
 * 1. Scan root folder recursively to find all vocabulary subfolder and json/sound/image files.
 * 2. For each leaf folder, open json file, parse and convert to new format json file.
 * 3. Restructure folder hiarachy to store "new" vocab folder.
 * 4. Insert json vocab to Postgres database.
 */

const LEMMAS_FILE =
  "C:/Users/thangqm/My Workspace/cth-azvocab-tool/lemmas_laban.json";

/**
 * Init logger
 */
await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG"),

    file: new log.handlers.FileHandler("INFO", {
      filename: `./parser.log`,
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

async function parse(lemmas, outputFile) {
  logger.info("Begining parser ...");

  let lemma;
  const parser = new DOMParser();
  let html;
  let vi;
  let en;
  const length = lemmas.length;
  //const length = 100;
  const results = [];
  let viCount = 0;
  let errCount = 0;
  for (let i = 0; i < length; i++) {
    lemma = lemmas[i];
    vi = lemma.data?.vi;
    en = lemma.data?.en;

    if (vi) {
      try {
        html = parser.parseFromString(vi);
        const content = html.getElementById("content_selectable");
        const childs = content.childNodes;
        let entry;
        let def;
        let description;
        let description2;
        let exp;
        for (let j = 0; j < childs.length; j++) {
          const node = childs[j];
          const className = node.className;
          if (className !== undefined) {
            // if (lemma.lemma === "sword") {
            //   console.log(className, node.innerText);
            // }

            if (className.indexOf("bold font-large") > -1) {
              //console.log("POS:", node.innerText);
              entry = {};

              if (lemma.entries) {
                entry.id = `${lemma.lemma}.${lemma.entries.length + 1}`;
              } else {
                lemma.entries = [];
                entry.id = `${lemma.lemma}.1`;
              }

              entry.pos = node.innerText;
              lemma.entries.push(entry);
            }

            if (className.startsWith("green")) {
              //console.log("DEF:", className, node.innerText);
              if (!entry) {
                entry = {};

                if (lemma.entries) {
                  entry.id = `${lemma.lemma}.${lemma.entries.length + 1}`;
                } else {
                  lemma.entries = [];
                  entry.id = `${lemma.lemma}.1`;
                }

                //entry.pos = node.innerText;
                lemma.entries.push(entry);
              }

              def = {};
              if (entry.defs) {
                def.id = `${entry.id}.${entry.defs.length + 1}`;
              } else {
                def.id = `${entry.id}.1`;
                entry.defs = [];
              }

              def.def = node.innerText;
              entry.defs.push(def);
            }

            if (className === "") {
              description = node.innerText;
            }

            if (className.startsWith("grey")) {
              description2 = node.innerText;
            }

            if (className.startsWith("color-light-blue")) {
              //Special case (not have major def)
              if (!entry) {
                continue;
              }

              //console.log("EXP en:", className, node.innerText);
              if (def) {
                if (
                  node.innerText.startsWith("xem") &&
                  node.innerHTML.indexOf("href=") > -1
                ) {
                  def.description = node.innerText;
                } else {
                  exp = node.innerText;
                  if (!exp.startsWith("/") && !exp.endsWith("/")) {
                    if (def.examples_en) {
                      def.examples_en.push(exp);
                    } else {
                      def.examples_en = [exp];
                    }
                  }
                }

                if (!def.def && (description || description2)) {
                  def.def = description || description2;
                }
              } else {
                def = {};

                if (entry.defs) {
                  def.id = `${entry.id}.${entry.defs.length + 1}`;
                } else {
                  def.id = `${entry.id}.1`;
                  entry.defs = [];
                }

                if (
                  node.innerText.startsWith("xem") &&
                  node.innerHTML.indexOf("href=") > -1
                ) {
                  def.description = node.innerText;
                } else {
                  exp = node.innerText;
                  if (!exp.startsWith("/") && !exp.endsWith("/")) {
                    if (def.examples_en) {
                      def.examples_en.push(exp);
                    } else {
                      def.examples_en = [exp];
                    }
                  }
                }

                if (!def.def && (description || description2)) {
                  def.def = description || description2;
                }

                entry.defs.push(def);

                // console.warn(
                //   `Not found def of lemma: ${lemma.lemma}, create description def:`,
                //   def
                // );
              }
            }

            if (className.startsWith("margin25")) {
              //console.log("EXP vi:", className, node.innerText);
              if (!entry) {
                continue;
              }

              if (def) {
                if (
                  node.innerText.startsWith("xem") &&
                  node.innerHTML.indexOf("href=") > -1
                ) {
                  def.description = node.innerText;
                } else {
                  exp = node.innerText;
                  if (!exp.startsWith("/") && !exp.endsWith("/")) {
                    if (def.examples_vi) {
                      def.examples_vi.push(exp);
                    } else {
                      def.examples_vi = [exp];
                    }
                  }
                }

                if (!def.def && (description || description2)) {
                  def.def = description || description2;
                }
              } else {
                def = {};

                if (entry.defs) {
                  def.id = `${entry.id}.${entry.defs.length + 1}`;
                } else {
                  def.id = `${entry.id}.1`;
                  entry.defs = [];
                }

                if (
                  node.innerText.startsWith("xem") &&
                  node.innerHTML.indexOf("href=") > -1
                ) {
                  def.description = node.innerText;
                } else {
                  exp = node.innerText;
                  if (!exp.startsWith("/") && !exp.endsWith("/")) {
                    if (def.examples_vi) {
                      def.examples_vi.push(exp);
                    } else {
                      def.examples_vi = [exp];
                    }
                  }
                }

                if (!def.def && (description || description2)) {
                  def.def = description || description2;
                }

                entry.defs.push(def);

                // console.warn(
                //   `Not found def of lemma: ${lemma.lemma}, create description def:`,
                //   def
                // );
              }
            }
          }
        }

        //console.log(lemma);
        if (
          def &&
          def.examples_en &&
          def?.examples_en?.length !== def?.examples_vi?.length
        ) {
          console.warn(
            `Lemma ${lemma.lemma} has difference vi and en examples`
          );
        }
        viCount++;
      } catch (err) {
        errCount++;
        console.warn(
          `Parse lemma error:`,
          err.message,
          ", lemma:",
          lemma.lemma,
          err
        );
        //console.log("TEXT===>", vi);
        //console.log("Parsing text:", vi);
      }
    }
    delete lemma.data;
    results.push(lemma);
  }

  logger.info(
    `Parsed ${length} lemmas, vi count: ${viCount}, error count: ${errCount}`
  );
  Deno.writeTextFileSync(outputFile, JSON.stringify(results));

  console.log("Reducing array ...");
  const array = results
    .map((lemma) =>
      lemma.entries?.map((entr) =>
        entr.defs?.map((def) => {
          return {
            Word: lemma.lemma,
            ID: `${entr.id}/${def.id}`,
            POS: entr.pos,
            Vietnamese: def.def,
            Examples_EN: def.examples_en?.join("\n"),
            Examples_VI: def.examples_vi?.join("\n"),
            Description: def.description || "",
          };
        })
      )
    )
    .reduce((a, b) => a.concat(b))
    .reduce((a, b) => a.concat(b))
    .filter((item) => item !== null && item !== undefined);

  Deno.writeTextFileSync("./lemma_entries.json", JSON.stringify(array));

  console.log(`Start writing ${array.length} definitions to excel file ...`);
  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(array, { nullError: true });
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `./lemmas.xlsx`, {
    compression: true,
  });

  //console.log(array.slice(0, 5));
  //return results;
}

const lemmas = await readLemmas(LEMMAS_FILE);

await parse(lemmas, "./lemmas_parsed.json");

logger.info("DONE!");
