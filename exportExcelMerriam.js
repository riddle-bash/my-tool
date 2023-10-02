import { xlsx } from "https://deno.land/x/flat@0.0.15/src/xlsx.ts";
const JSONDATA = "./meriam.json";
const parsedData = await Deno.readTextFile(JSONDATA);
const dataJson = JSON.parse(parsedData);

const data = dataJson.reduce(
  (acc, curr) => {
    const result = [];

    curr.def?.forEach((definition) => {
      const newObj = [];

      newObj.push(curr.vocab);
      newObj.push(definition.def);
      newObj.push(definition.pos);
      newObj.push(definition.exp.join("\n"));
      result.push(newObj);
    });

    if (curr.def === null || curr.def.length === 0) {
      result.push([curr.vocab, "", "", ""]);
    }
    // console.log(newObj);
    acc.push(...result);
    return acc;
  },
  [["Vocabulary", "Definition", "Part of Speech", "Example"]]
);

const workbook = xlsx.utils.book_new();

const worksheet = xlsx.utils.aoa_to_sheet(data);

xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

const excelFileName = "exported_data_Merriam.xlsx";
await xlsx.writeFile(workbook, excelFileName);
