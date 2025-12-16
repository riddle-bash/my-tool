import { xlsx } from 'https://deno.land/x/flat@0.0.15/src/xlsx.ts'

const map1 = {
  ST_CO_SL: 'Sentence_Collocation_Selection',
  WD_CO_MT: 'Word_Collocation_Match',
  WD_CO_SL: 'Word_Collocation_Selection',
  SP_FA_SL: 'Example_WordFamily_Selection',
  SP_IM_WD_MT: 'Example_Image_Word_Match',
  SP_IM_WD_SL: 'Example_Image_Word_Selection',
  SP_IM_WD_US: 'Example_Image_Word_Unscramble',
  SP_IM_WD_MS: 'Example_Image_Word_MissingChar',
  SP_IM_WD_TY: 'Example_Image_Word_Type',
  AU_WD_SL: 'Audio_Word_Selection',
  AU_WD_US: 'Audio_Word_Unscramble',
  AU_WD_MT: 'Audio_Word_Match',
  AU_WD_TY: 'Audio_Word_Type',
  PRON: 'Pronunciation',
  SP_PRON: 'Sample_Pronunciation',
  WD_IM_SL: 'Word_Image_Selection',
  WD_IM_MT: 'Word_Image_Match',
  WD_DE_SL: 'Word_Definition_Selection',
  WD_DE_MT: 'Word_Definition_Match',
  IM_WD_US: 'Image_Word_Unscramble',
  WD_SY_SL: 'Word_Synonym_Selection',
  WD_AN_SL: 'Word_Antonym_Selection',
  DE_WD_US: 'Definition_Word_Unscramble',
  IM_WD_SL: 'Image_Word_Selection',
  DE_WD_SL: 'Definition_Word_Selection',
  SP_WD_SL: 'Sample_Word_Selection',
  WD_ST_MT: 'Word_Sentence_Match',
  SP_SY_SL: 'Sample_Synonym_Selection',
  IM_WD_TY: 'Image_Word_Type',
  DE_WD_TY: 'Definition_Word_Type',
  SY_WD_TY: 'Synonym_Word_Type',
  SP_WD_TY: 'Sample_Word_Type',
  ST_US: 'Sentence_Unscramble',
  ST_WF_SL: 'Sentence_WordForm_Selection',
  AU_WD_MS: 'Audio_Word_MissingChar',
  IM_WD_MS: 'Image_Word_MissingChar',
  DE_WD_MS: 'Definition_Word_MissingChar',
  SP_WD_MS: 'Sample_Word_MissingChar',
  SP_WD_US: 'Sample_Word_Unscramble',
  AU_IM_MT: 'Audio_Image_Match',
  AU_IM_SL: 'Audio_Image_Selection',
  ST_CO: 'Sentence_Completion',
  IM_AU_SL: 'Image_Audio_Selection',
  WD_AU_SL: 'Word_Audio_Selection',
}

// Read the Excel file
const configFile = xlsx.readFile('./adult short.xlsx')
const configSheet = configFile.Sheets[configFile.SheetNames[0]]

// Convert sheet to JSON
const sheetData = xlsx.utils.sheet_to_json(configSheet, { header: 1 })

// Initialize an empty object to store the result
const stage = {}

// Loop through the rows in the sheet (starting from the second row to skip headers)
for (let i = 1; i < sheetData.length; i++) {
  const [stageId, questionTypeId] = sheetData[i]

  // Split the questionTypeId into an array of valid types based on '\r\n'
  const stageArray = questionTypeId
    ?.split('\r\n')
    ?.filter((item) => map1[item.trim()])
    ?.map((item) => `QUESTION_TYPE_ID.${map1[item.trim()]}`)

  // If the stageId doesn't exist in the stage object, create an array for it
  if (stageArray?.length > 0) {
    if (!stage[stageId]) {
      stage[stageId] = []
    }
    // Push the stageArray values into the corresponding stageId array
    stage[stageId].push(...stageArray)
  }

  // console.log(questionTypeId)
}

// console.log(stage)

// Write alternative.json
await Deno.writeTextFile('./out/stage.json', JSON.stringify(stage, null, 2))
