import { fs } from "./deps.ts";
import { path } from "./deps.ts";
import { log } from "./deps.ts";
import { postgres } from "./deps.ts";

/**
 * Refactor dictionary data: Correct pronunciation media field (move to root object), include subfolder to file. Add entry id, definiction id.
 * 1. Scan root folder recursively to find all vocabulary subfolder and json/sound/image files.
 * 2. For each leaf folder, open json file, parse and convert to new format json file.
 * 3. Restructure folder hiarachy to store "new" vocab folder.
 * 4. Insert json vocab to Postgres database.
 */

const DICTIONARY_DIR = "C:/Users/thangqm/My Workspace/AzVocab/data/media";
const NEW_DIR = "C:/Users/thangqm/My Workspace/AzVocab/data/media2";

const files = [];
const unknownFiles = [];

/**
 * Init logger
 */
await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG"),

    file: new log.handlers.FileHandler("INFO", {
      filename: "./log.txt",
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

/**
 * Scan for json files in root directory and sub directories.
 * Put full json file path in files array
 * @param {current directory to scan} currentPath
 */
function scanDir(currentPath) {
  //TODO: Remove when finish test to process all files
  //if (files.length > 10) {
  //  return;
  //}

  let fullPath;
  let lower;
  try {
    for (const dirEntry of Deno.readDirSync(currentPath)) {
      fullPath = `${currentPath}/${dirEntry.name}`;
      lower = fullPath.toLowerCase();

      if (dirEntry.isDirectory) {
        scanDir(fullPath);
      } else if (dirEntry.isFile) {
        //console.log(fullPath);
        if (lower.endsWith(".json")) {
          files.push(fullPath);
        }
      } else {
        logger.warning("Unknown dir entry", dirEntry);
      }
    }
  } catch (err) {
    logger.warning("Scan directory", currentPath, "error:", err);
  }
}

async function transform(file) {
  const text = await Deno.readTextFile(file);
  const json = JSON.parse(text); //Old vocab format
  const vocab = JSON.parse(text); //New vocab
  const basedir = path.dirname(file); //Old dir
  const newDir = basedir.replace(DICTIONARY_DIR, NEW_DIR);

  //Make new directory if not exists
  fs.ensureDirSync(newDir);

  const vocabDir = basedir.replace(DICTIONARY_DIR, "");

  const word = json.vocab;

  //let fileName;
  let existed;
  let pron_uk;
  let pron_us;

  let vocabPronUk;
  let vocabPronUs;

  //Last entry has exist pron
  let lastExistPronUk;
  let lastExistPronUs;
  vocab.entries.forEach((entry, idx) => {
    entry.id = `${word}.${idx + 1}`; //Add id attribute
    pron_uk = entry.pron_uk;
    pron_us = entry.pron_us;

    existed = fs.existsSync(`${basedir}/${pron_uk}`);
    //Move the first entry pron to default vocab pron
    if (idx === 0 && existed) {
      vocabPronUk = `${vocabDir}/${pron_uk.replace(`.${entry.pos}`, "")}`;
      vocab.pron_uk = vocabPronUk;
      //Copy to new file
      Deno.copyFileSync(`${basedir}/${pron_uk}`, `${NEW_DIR}${vocabPronUk}`);
      //lastExistPronUk = vocabPronUk;
      //Remove entry pron, so it will use root vocab.pron
      delete entry.pron_uk;
    } else if (existed) {
      //Exist and idx > 0
      //Check if default root pron exist. If not, use this as default root rpon
      if (!vocabPronUk) {
        logger.warning(`Vocab ${word} use default pron_uk at index ${idx}`);
        vocabPronUk = `${vocabDir}/${pron_uk.replace(`.${entry.pos}`, "")}`;
        vocab.pron_uk = vocabPronUk;

        //Copy to new file
        Deno.copyFileSync(`${basedir}/${pron_uk}`, `${NEW_DIR}${vocabPronUk}`);
        lastExistPronUk = vocabPronUk;
        //Remove entry pron, so it will use root vocab.pron
        delete entry.pron_uk;
      } else {
        lastExistPronUk = `${vocabDir}/${pron_uk}`;
        Deno.copyFileSync(
          `${basedir}/${pron_uk}`,
          `${NEW_DIR}${lastExistPronUk}`
        );

        //Use new media subfolder
        entry.pron_uk = lastExistPronUk;
      }
    } else if (idx === 0) {
      //Not exist but idx === 0? What should we do?
      logger.warning(`Vocab ${word} not found pron_uk at index ${idx}`);
    } else {
      // idx > 0 and not exist. Remove so it will use root pron. Use last exist if not then use root
      if (lastExistPronUk) {
        entry.pron_uk = lastExistPronUk;
      } else {
        delete entry.pron_uk;
      }
    }

    existed = fs.existsSync(`${basedir}/${pron_us}`);
    if (idx === 0 && existed) {
      vocabPronUs = `${vocabDir}/${pron_us.replace(`.${entry.pos}`, "")}`;
      vocab.pron_us = vocabPronUs;
      //Copy to new file
      Deno.copyFileSync(`${basedir}/${pron_us}`, `${NEW_DIR}${vocabPronUs}`);

      //Remove entry pron, so it will use root vocab.pron
      delete entry.pron_us;
    } else if (existed) {
      //Exist and idx > 0
      //Check if default root pron exist. If not, use this as default root rpon
      if (!vocabPronUs) {
        logger.warning(`Vocab ${word} use default pron_us at index ${idx}`);
        vocabPronUs = `${vocabDir}/${pron_us.replace(`.${entry.pos}`, "")}`;
        vocab.pron_us = vocabPronUs;

        //Copy to new file
        Deno.copyFileSync(`${basedir}/${pron_us}`, `${NEW_DIR}${vocabPronUs}`);
        lastExistPronUs = vocabPronUs;
        //Remove entry pron, so it will use root vocab.pron
        delete entry.pron_us;
      } else {
        lastExistPronUs = `${vocabDir}/${pron_us}`;
        Deno.copyFileSync(
          `${basedir}/${pron_us}`,
          `${NEW_DIR}${lastExistPronUs}`
        );

        //Use new media subfolder
        entry.pron_us = lastExistPronUs;
      }
    } else if (idx === 0) {
      //Not exist but idx === 0? What should we do?
      logger.warning(`Vocab ${word} not found pron_us at index ${idx}`);
    } else {
      // idx > 0 and not exist. Use last exist else use root
      if (lastExistPronUs) {
        entry.pron_us = lastExistPronUs;
      } else {
        delete entry.pron_us;
      }
    }

    entry.defs.forEach((def, defIdx) => {
      def.id = `${entry.id}.${defIdx + 1}`;

      //Remove images if this is not default definition
      if (!def.default) {
        def.images = [];
      } else {
        //Copy image file to new directory.
        const newImages = [];
        def.images.forEach((img) => {
          const imgFile = `${vocabDir}/${img}`;
          try {
            Deno.copyFileSync(`${basedir}/${img}`, `${NEW_DIR}${imgFile}`);
            newImages.push(imgFile);
          } catch (imgErr) {
            logger.warning("Copy image error:", imgErr);
          }
        });

        def.images = newImages;
      }
    });
  });

  const checkDb = await runQuery(
    "select exists(select 1 from vocabs where vocab = $1)",
    [word]
  );
  if (checkDb.rows[0].exists) {
    logger.info(`Vocab '${word}' already exists, ignore ...`);
    return 0;
  }

  try {
    const jsonFile = `${newDir}/${word}.json`;
    Deno.writeTextFileSync(jsonFile, JSON.stringify(vocab));

    logger.info(`===>Vocab: '${word}' transform ${file} successfully.`);

    const dbResult = await runQuery(
      "Insert into vocabs (vocab, json, source) values ($1, $2, $3)",
      [vocab.vocab, vocab, vocab.dict]
    );
    if (dbResult.rowCount < 1) {
      logger.warning(`Insert vocab '${word} to db failed.`);
    }

    return 1;
  } catch (err) {
    logger.warning(`Transform file ${file} error: ${err}`);
    return 0;
  }
}

/**
 * Handle PostGres Database actions
 * postgres://postgres:postgrespw@localhost:49153
 */
const POOL_CONNECTIONS = 10;
const db_params = {
  connection: {
    attempts: 2,
  },
  database: "postgres",
  hostname: "localhost",
  password: "postgrespw",
  port: 49153,
  user: "postgres",
};
const dbPool = new postgres.Pool(db_params, POOL_CONNECTIONS, true); // `true` indicates lazy connections

async function runQuery(query, args) {
  const client = await dbPool.connect();
  let result;
  try {
    result = await client.queryObject(query, args);
  } finally {
    client.release();
  }
  return result;
}

logger.info(`Begin scanning directory ${DICTIONARY_DIR}`);
scanDir(DICTIONARY_DIR);
logger.info(`Found ${files.length} json files`);

logger.info(`Unknown files: ${unknownFiles}`);

let successCnt = 0;
for (const file of files) {
  try {
    successCnt += await transform(file);
  } catch (err) {
    logger.warning(`Transform file ${file} error: ${err}`);
  }
}

const result = await runQuery("Select * from vocabs");
logger.info(`Found ${result.rows.length} vocabs in database`);

logger.info(`Transform success ${successCnt} vocabularies .Done!`);
