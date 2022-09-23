import { fs } from "./deps.ts";
import { path } from "./deps.ts";
import { log } from "./deps.ts";
import { download } from "./deps.ts";
import { postgres } from "./deps.ts";

/**
 * 1. Scan root folder recursive ly to find all vocabulary subfolder and json/sound/image files.
 * 2. For each leaf folder, open json file, parse and convert to new format json file.
 * 3. Restructure folder hiarachy to store "new" vocab folder.
 * 4. Insert json vocab to Postgres database.
 */

const DICTIONARY_DIR =
    "C:/Users/thangqm/My Workspace/AzVocab/Huy/database/azvocab";
const NEW_DIR = "C:/Users/thangqm/My Workspace/AzVocab/media";

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
                let msg = `${
                    fmt.format(logRecord.datetime)
                } ${logRecord.levelName} ${logRecord.msg}`;

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

let ukSoundFileCnt = 0;
let usSoundFileCnt = 0;
let imgCnt = 0;

/**
 * Scan for json files in root directory and sub directories.
 * Put full json file path in files array
 * @param {current directory to scan} currentPath
 */
function scanDir(currentPath) {
    //TODO: Remove when finish test to process all files
    //if (files.length > 10) {
    //    return;
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
                if (lower.indexOf("uk") > -1 && lower.endsWith("mp3")) {
                    ukSoundFileCnt++;
                } else if (lower.indexOf("us") > -1 && lower.endsWith("mp3")) {
                    usSoundFileCnt++;
                } else if (
                    lower.endsWith("jpg") || lower.endsWith("svg") ||
                    lower.endsWith("png") || lower.endsWith("gif") ||
                    lower.endsWith("jpeg")
                ) {
                    imgCnt++;
                } else if (lower.indexOf("json") === -1) {
                    unknownFiles.push(dirEntry.name);
                }

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
    let word = path.basename(file);
    const basedir = path.dirname(file);
    word = word.substring(0, word.indexOf("."));

    const checkDb = await runQuery('select exists(select 1 from vocabs where vocab = $1)', [word]);
    if (checkDb.rows[0].exists) {
        logger.info(`Vocab '${word}' already exists, ignore ...`);
        return 0;
    }

    let newDir = `${NEW_DIR}/${word.charAt(0)}`;
    if (word.length > 2) {
        newDir = `${newDir}/${word.substring(0, 2)}`;
    }

    newDir = `${newDir}/${word}`;

    const text = await Deno.readTextFile(file);
    const json = JSON.parse(text); //Old vocab format

    const vocab = {}; //New vocab
    const wid = json.wid;
    vocab.vocab = json.name;
    vocab.source = json.link;
    if (json.link) {
        const link = json.link.toLowerCase();

        if (link.indexOf('cambridge') > -1) {
            vocab.dict = 'Cambridge';
        } else if (link.indexOf('oxford') > -1) {
            vocab.dict = 'Oxford';
        } else if (link.indexOf('macmillan') > -1) {
            vocab.dict = 'Macmillan';
        } else if (link.indexOf('wordsmyth') > -1) {
            vocab.dict = 'Wordsmyth';
        } else if (link.indexOf('vocabulary.com') > -1) {
            vocab.dict = 'vocabulary.com';
        } else {
            const idx = link.indexOf('//') + 2;
            vocab.dict = link.substring(idx, link.indexOf('/', idx + 2));
        }
    }
    vocab.uk = json.uk;
    vocab.us = json.us;
    vocab.entries = [];

    let ve;
    let img;

    const mediaSet = new Set();
    const mediaFiles = [];
    let mediaFile;
    try {
        for (const entry of json.entries) {
            ve = {};
            ve.pos = entry.pos || 'unknown';
            ve.uk = entry.uk || json.uk;
            ve.us = entry.us || json.us;

            ve.idioms = entry.idioms;
            ve.verb_phrases = entry.phrasal_verbs;

            ve.pron_uk = entry.pron_uk || json.pron_uk;
            let mediaKey;

            if (ve.pron_uk) {
                mediaKey = ve.pron_uk;
                mediaFile = {};
                mediaFile.vocab = word;
                mediaFile.pos = ve.pos;

                if (ve.pron_uk.startsWith("http")) {
                    mediaFile.link = ve.pron_uk;
                    mediaFile.name = `${word}.${ve.pos}.uk${ve.pron_uk.substring(ve.pron_uk.lastIndexOf('.'))}`;
                    mediaFile.dir = newDir;

                    ve.pron_uk = mediaFile.name;
                } else if (ve.pron_uk.startsWith('.')) {
                    mediaFile.src = `${basedir}/${word}.${wid}${ve.pron_uk}`;
                    mediaFile.name = `${word}.${ve.pos}.uk${ve.pron_uk.substring(ve.pron_uk.lastIndexOf('.'))}`;

                    mediaFile.des = `${newDir}/${mediaFile.name}`;   
                    
                    ve.pron_uk = mediaFile.name;
                } else {
                    mediaFile.src = `${basedir}/${ve.pron_uk}`;
                    mediaFile.name = `${word}.${ve.pos}.uk${ve.pron_uk.substring(ve.pron_uk.lastIndexOf('.'))}`;

                    mediaFile.des = `${newDir}/${mediaFile.name}`;   
                    
                    ve.pron_uk = mediaFile.name;
                }

                if (!mediaSet.has(mediaKey)) {
                    mediaSet.add(mediaKey);
                    mediaFiles.push(mediaFile);
                }
            }

            ve.pron_us = entry.pron_us || json.pron_us;
            if (ve.pron_us) {
                mediaKey = ve.pron_us;

                mediaFile = {};
                mediaFile.vocab = word;
                mediaFile.pos = ve.pos;

                if (ve.pron_us.startsWith("http")) {
                    mediaFile.link = ve.pron_us;
                    mediaFile.name = `${word}.${ve.pos}.us${ve.pron_us.substring(ve.pron_us.lastIndexOf('.'))}`;
                    mediaFile.dir = newDir;

                    ve.pron_us = mediaFile.name;
                } else if (ve.pron_us.startsWith('.')) {
                    mediaFile.src = `${basedir}/${word}.${wid}.${ve.pron_us}`;
                    mediaFile.name = `${word}.${ve.pos}.us${ve.pron_us.substring(ve.pron_us.lastIndexOf('.'))}`;

                    mediaFile.des = `${newDir}/${mediaFile.name}`;   
                    
                    ve.pron_us = mediaFile.name;
                } else {
                    mediaFile.src = `${basedir}/${ve.pron_us}`;
                    mediaFile.name = `${word}.${ve.pos}.us${ve.pron_us.substring(ve.pron_us.lastIndexOf('.'))}`;

                    mediaFile.des = `${newDir}/${mediaFile.name}`; 
                    ve.pron_us = mediaFile.name;
                }

                if (!mediaSet.has(mediaKey)) {
                    mediaSet.add(mediaKey);
                    mediaFiles.push(mediaFile);
                }
            }

            ve.defs = [];

            let vedef;
            let entryDef;
            for (const def of (entry.defs || entry.definitions)) {
                vedef = {};
                entryDef = def.def || def.definition;
                img = def.img || def.image || entry.img || entry.image;

                if (
                    entryDef.localeCompare(entry.def || entry.definition) === 0
                ) {
                    vedef.default = true;
                }

                vedef.level = def.level;
                vedef.def = def.def || def.definition;
                vedef.examples = def.exs || def.examples || [];
                
                if (def.ex || def.example) {
                    vedef.examples.push(def.ex || def.example);
                }

                vedef.related_words = def.related_words || [];

                vedef.synonyms = def.synonyms || [];
                vedef.antonyms = def.antonyms || [];
                vedef.images = [];

                if (img) {
                    mediaFile = {};
                    mediaFile.vocab = word;
                    mediaFile.pos = ve.pos;

                    if (img.startsWith(".")) {
                        img = word + '.' + wid + img;

                        mediaFile.name = `${word}.${ve.pos}.${Date.now()}${img.substring(img.lastIndexOf('.'))}`;

                        mediaFile.src = `${basedir}/${img}`;
                        mediaFile.des = `${newDir}/${mediaFile.name}`;

                        vedef.images.push(mediaFile.name);
                    } else if (img.startsWith("http")) {
                        mediaFile.link = img;
                        mediaFile.dir = newDir;
                        mediaFile.name = `${word}.${ve.pos}.${Date.now()}${img.substring(img.lastIndexOf('.'))}`;

                        vedef.images.push(mediaFile.name);
                    }

                    if (!mediaSet.has(img)) {
                        mediaSet.add(img);
                        mediaFiles.push(mediaFile);
                    }
                } else if (def.imgs || def.images) {
                    //Handle some case image array in def object
                    const imgs = def.imgs || def.images;
                    if (imgs.constructor === Array) {
                        imgs.forEach(img => {
                            mediaFile = {};
                            mediaFile.vocab = word;
                            mediaFile.pos = ve.pos;
        
                            if (img.startsWith(".")) {
                                img = word + '.' + wid + img;
                                
                                mediaFile.name = `${word}.${ve.pos}.${Date.now()}${img.substring(img.lastIndexOf('.'))}`;

                                mediaFile.src = `${basedir}/${img}`;
                                mediaFile.des = `${newDir}/${mediaFile.name}`;                                

                                vedef.images.push(mediaFile.name);
                            } else if (img.startsWith("http")) {
                                mediaFile.link = img;
                                mediaFile.dir = newDir;
                                mediaFile.name = `${word}.${ve.pos}.${Date.now()}${img.substring(img.lastIndexOf('.'))}`;
                                vedef.images.push(mediaFile.name);
                            }
        
                            if (!mediaSet.has(img)) {
                                mediaSet.add(img);
                                mediaFiles.push(mediaFile);
                            }                            
                        });
                    }

                }

                vedef.videos = [];

                ve.defs.push(vedef);
            }

            vocab.entries.push(ve);
        }

        const jsonFile = `${newDir}/${word}.json`;

        //Make new directory if not exists
        fs.ensureDirSync(newDir);
        Deno.writeTextFileSync(jsonFile, JSON.stringify(vocab));
        for (const media of mediaFiles) {
            let downloadSuccess = false;
            let retry = 0;
            if (media.link) { 
                do {               
                    try {
                        retry += 1;
                        const dest = {
                            file: media.name,
                            dir: media.dir
                        }
                        await download.download(media.link, dest);
                        logger.info(
                            `Vocab: '${media.vocab} (${media.pos})'. Download: ${media.link} => ${media.dir}/${media.name}`,
                        );
                        downloadSuccess = true;   
                    } catch (err) {
                        logger.warning(`Vocab: '${media.vocab} (${media.pos})'. Download: ${media.link} error: ${err}`);
                    } 
                } while (!downloadSuccess && (retry < 3));
            } else {
                Deno.copyFileSync(media.src, media.des);
                logger.info(
                    `Vocab: '${media.vocab} (${media.pos})'. Copy ${media.src} => ${media.des}`,
                );
            }
        }
        logger.info(`===>Vocab: '${word}' transform ${file} successfully.`);
        const dbResult = await runQuery("Insert into vocabs (vocab, json, source) values ($1, $2, $3)", [vocab.vocab, vocab, vocab.dict]);
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
}
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
logger.info(
    `Found ${files.length} json files, ${ukSoundFileCnt} uk files, ${imgCnt} image files and ${usSoundFileCnt} us files.`,
);

logger.info(`Unknown files: ${unknownFiles}`);

let successCnt = 0;
for (const file of files) {
    try {
        successCnt += await transform(file);        
    } catch (err) {
        logger.warning(`Transform file ${file} error: ${err}`);
    }
}
const result = await runQuery('Select * from vocabs');
logger.info(`Found ${result.rows.length} vocabs in database`);
logger.info(`Transform success ${successCnt} vocabularies .Done!`);
