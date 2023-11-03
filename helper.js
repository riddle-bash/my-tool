const POS_MAP = {
  noun: 'n',
  adjective: 'adj',
  verb: 'v',
  adverb: 'adv',
  preposition: 'prep',
  pronoun: 'pron',
  conjunction: 'conj',
  aux: 'aux',
  auxiliary: 'aux',
  idiom: 'idm',
  exclamation: 'exc',
  determiner: 'det',
}

export const INFLECTS = {
  //JJ: 'Adj',
  JJR: 'Adj comparative',
  JJS: 'Adj superlative',
  //RB: 'Adverb',
  RBR: 'Adv comparative',
  RBS: 'Adv superlative',
  //NN: 'Noun',
  NNS: 'Noun plural',
  NNP: 'Proper noun',
  NNPS: 'Proper noun plural',
  //VB: 'Verb',
  VBD: 'Verb past tense',
  VBG: 'Verb present participle',
  VBN: 'Verb past participle',
  VBP: 'Verb non-3rd single present',
  VBZ: 'Verb 3rd single present',
  //MD: 'Modal',
}

const POS = Object.values(POS_MAP)

export const getLemmaId = (lemma, pos) => {
  let p
  if (POS.includes(pos?.toLowerCase())) {
    p = pos.toLowerCase()
  } else {
    p = POS_MAP[pos?.toLowerCase()]

    if (!p) {
      throw new Error(`PoS not found ${pos}`)
    }
  }

  return { id: `${lemma.toLowerCase().replace(/\s/g, '')}.${p}`, pos: p }
}
