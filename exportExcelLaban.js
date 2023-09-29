import { xlsx } from "https://deno.land/x/flat@0.0.15/src/xlsx.ts";
const JSONDATA = "./laban.json";
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
      result.push(newObj);
    });

    if (curr.def?.length === 0) {
      result.push([curr.vocab, "", ""]);
    }
    // console.log(newObj);
    acc.push(...result);
    return acc;
  },
  [["Vocabulary", "Definition", "Part of Speech"]]
);

const workbook = xlsx.utils.book_new();

const worksheet = xlsx.utils.aoa_to_sheet(data);

xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

const excelFileName = "exported_data_Laban.xlsx";
await xlsx.writeFile(workbook, excelFileName);
