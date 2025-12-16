import { xlsx } from "https://deno.land/x/flat@0.0.15/src/xlsx.ts";
const JSONDATA = "./cambridge4.json";
const parsedData = await Deno.readTextFile(JSONDATA);
const dataJson = JSON.parse(parsedData);

const data = dataJson.reduce(
  (acc, curr) => {
    const result = [];

    let usPronunciation;
    let usSound;
    let ukPronunciation;
    let ukSound;
    curr.def?.forEach((definition) => {
      const newObj = [];
      usPronunciation = curr?.pronounce?.us?.pronunciation;
      usSound = curr?.pronounce?.us?.sound;
      ukPronunciation = curr?.pronounce?.uk?.pronunciation;
      ukSound = curr?.pronounce?.uk?.sound;
      const idiom = curr?.idiom;

      newObj.push(curr.vocab);
      newObj.push(definition.def);
      newObj.push(definition.cefr);
      newObj.push(definition.pos);
      newObj.push(definition.exp.join("\n"));
      newObj.push(usPronunciation);
      newObj.push(usSound);
      newObj.push(ukPronunciation);
      newObj.push(ukSound);
      newObj.push(idiom.join("\n"));
      newObj.push(definition.synonyms.join("\n"));
      newObj.push(definition.relatedWord.join("\n"));
      result.push(newObj);
    });

    if (curr.def === null) {
      result.push([
        curr.vocab,
        "",
        "",
        "",
        "",
        usPronunciation ? usPronunciation : "",
        usSound ? usSound : "",
        ukPronunciation ? ukPronunciation : "",
        ukSound ? ukSound : "",
        "",
        "",
        "",
      ]);
    }
    // console.log(newObj);
    acc.push(...result);
    return acc;
  },
  [
    [
      "Vocabulary",
      "Definition",
      "CEFR",
      "Part of Speech",
      "Example",
      "Pronounce US",
      "Sound US",
      "Pronounce UK",
      "Sound UK",
      "idiom",
      "synonyms",
      "relatedWord",
    ],
  ]
);

const workbook = xlsx.utils.book_new();

const worksheet = xlsx.utils.aoa_to_sheet(data);

xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

const excelFileName = "exported_data_Cambridge4.xlsx";
await xlsx.writeFile(workbook, excelFileName);
