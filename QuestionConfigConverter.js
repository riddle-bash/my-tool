import { xlsx } from 'https://deno.land/x/flat@0.0.15/src/xlsx.ts'

const map1 = {
  'Example - Collocation Selecting': 'Sentence_Collocation_Selection',
  'Word - Collocation Matching': 'Word_Collocation_Match',
  'Word - Collocation Selecting': 'Word_Collocation_Selection',
  'Example - Word Family Selecting': 'Example_WordFamily_Selection',
  'Example Image - Word Matching': 'Example_Image_Word_Match',
  'Example Image - Word Typing': 'Example_Image_Word_Type',
  'Example Image - Word Unscramble': 'Example_Image_Word_Unscramble',
  'Example Image - Word Completing': 'Example_Image_Word_MissingChar',
  'Example Image - Word Selecting': 'Example_Image_Word_Selection',
  'Audio - Word Matching': 'Audio_Word_Match',
  'Audio - Word Selecting': 'Audio_Word_Selection',
  'Audio - Word Typing': 'Audio_Word_Type',
  'Audio - Word Unscrambling': 'Audio_Word_Unscramble',
  'Definition - Word Selecting': 'Definition_Word_Selection',
  'Definition - Word Typing': 'Definition_Word_Type',
  'Definition - Word Unscrambling': 'Definition_Word_Unscramble',
  'Image - Word Selecting': 'Image_Word_Selection',
  'Image - Word Typing': 'Image_Word_Type',
  'Image - Word Unscrambling': 'Image_Word_Unscramble',
  'Word - Pronunciation Checking': 'Pronunciation',
  'Sentence - Pronunciation Checking': 'Sample_Pronunciation',
  'Example - Synonym Selecting': 'Sample_Synonym_Selection',
  'Example - Word Selecting': 'Sample_Word_Selection',
  'Example - Word Typing': 'Sample_Word_Type',
  'Example Unscrambling': 'Sentence_Unscramble',
  'Sentence - Word Form Selection': 'Sentence_WordForm_Selection',
  'Word - Synonym Typing': 'Synonym_Word_Type',
  'Word - Antonym Selecting': 'Word_Antonym_Selection',
  'Word - Definition Matching': 'Word_Definition_Match',
  'Word - Definition Selecting': 'Word_Definition_Selection',
  'Word - Image Matching': 'Word_Image_Match',
  'Word - Image Selecting': 'Word_Image_Selection',
  'Word - Example Matching': 'Word_Sentence_Match',
  'Word - Synonym Selecting': 'Word_Synonym_Selection',
  'Example - Word Unscrambling': 'Sample_Word_Unscramble',
  'Image - Word Completing': 'Image_Word_MissingChar',
  'Audio - Word Completing': 'Audio_Word_MissingChar',
  'Audio - Image Matching': 'Audio_Image_Match',
  'Definition - Word Completing': 'Definition_Word_MissingChar',
  'Example - Word Completing': 'Sample_Word_MissingChar',
  'Example Completing': 'Sentence_Completion',
  'Image - Audio Selecting': 'Image_Audio_Selection',
  'Word - Audio Selecting': 'Word_Audio_Selection',
  'Audio - Image Selecting': 'Audio_Image_Selection',
}

const map2 = {
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
const configFile = xlsx.readFile('./Book5.xlsx')
const configSheet = configFile.Sheets[configFile.SheetNames[0]]

// Convert sheet to JSON
const sheetData = xlsx.utils.sheet_to_json(configSheet, { header: 1 })

// Initialize an empty object to store the result
const alternative = {}
const optional = {}

// Loop through the rows in the sheet (starting from the second row to skip headers)
for (let i = 1; i < sheetData.length; i++) {
  const [id, alternativeName, optionalName] = sheetData[i]

  // Split the alternative and optional names into arrays based on '\r\n'
  const alternativeArray = alternativeName
    ?.split('\r\n')
    ?.filter((i) => map1[i.trim()])
    ?.map((item) => `QUESTION_TYPE_ID.${map1[item.trim()]}`)
  const optionalArray = optionalName
    ?.split('\r\n')
    ?.filter((i) => map1[i.trim()])
    ?.map((item) => `QUESTION_TYPE_ID.${map1[item.trim()]}`)

  // Structure the output object

  if (alternativeArray?.length > 0)
    alternative[`[QUESTION_TYPE_ID.${map2[id]}]`] = alternativeArray

  if (optionalArray?.length > 0)
    optional[`[QUESTION_TYPE_ID.${map2[id]}]`] = optionalArray
}
// Write alternative.json
await Deno.writeTextFile(
  './out/alternative.json',
  JSON.stringify(alternative, null, 2)
)

// Write optional.json
await Deno.writeTextFile(
  './out/optional.json',
  JSON.stringify(optional, null, 2)
)
