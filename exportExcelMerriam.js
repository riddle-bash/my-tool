import { xlsx } from "https://deno.land/x/flat@0.0.15/src/xlsx.ts";
const JSONDATA = "./meriam.json";
const parsedData = await Deno.readTextFile(JSONDATA);
const dataJson = JSON.parse(parsedData);

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

const data = dataJson.reduce(
  (acc, curr) => {
    const result = [];

    curr.def?.forEach((definition) => {
      const newObj = [];

      newObj.push(curr.vocab);
      newObj.push(definition.def);
      newObj.push(
        POS_MAP.hasOwnProperty(definition.pos) ? POS_MAP[definition.pos] : ""
      );
      newObj.push(definition.exp.join("\n"));
      newObj.push(definition.pronunciation);
      newObj.push(definition.synonyms);
      newObj.push(definition.antonyms);
      result.push(newObj);
    });

    if (curr?.def === null || curr?.def?.length === 0) {
      result.push([curr.vocab, "", "", "", "", "", ""]);
    }

    acc.push(...result);
    return acc;
  },
  [
    [
      "Vocabulary",
      "Definition",
      "Part of Speech",
      "Example",
      "Pronunciation",
      "synonyms",
      "antonyms",
    ],
  ]
);

const workbook = xlsx.utils.book_new();

const worksheet = xlsx.utils.aoa_to_sheet(data);

xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

const excelFileName = "exported_data_Merriam.xlsx";
await xlsx.writeFile(workbook, excelFileName);
