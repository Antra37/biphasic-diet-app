// Supplements that aren't in the NIH label database (it only covers US labels), e.g.
// Australian practitioner brands. The supplement lookup searches these alongside the NIH data.
// Copy every figure from the manufacturer's label/product sheet and record where it came from.
// `unit` is written as it should read after the quantity (e.g. "capsules" for "1-2 capsules").
window.SIBO_EXTRA_SUPPLEMENTS = [
  {
    id: "biomedica-phytaxil",
    brand: "BioMedica",
    name: "Phytaxil",
    form: "Capsule",
    aliases: ["bio medica", "phytaxyl"],
    serving: { min: 1, max: 2, unit: "capsules", minDaily: 2, maxDaily: 3 },
    amounts: [
      "Oregano essential oil 50 mg",
      "Garlic bulb ext. (Allisure) 60 mg",
      "Phellodendron stem bark ext. 100 mg (berberine 47.5 mg)",
      "Thyme leaf ext. 60 mg (from 600 mg dry leaf)",
      "Myrrh gum oleoresin ext. 25 mg (from 250 mg)",
    ],
    directions: "Directions: 1-2 capsules, 2-3 times per day with water, or as directed by your healthcare practitioner.",
    warnings: "Warnings: If symptoms persist, talk to your health professional. Not to be used in children under 2 years of age without medical advice.",
    source: "BioMedica product sheet V.05/22",
  },
  {
    id: "biomedica-allimax",
    brand: "BioMedica",
    name: "Allimax",
    form: "Capsule",
    aliases: ["bio medica", "garlic", "allisure"],
    serving: { min: 1, max: 2, unit: "capsules", minDaily: 3, maxDaily: 3 },
    amounts: [
      "Allisure garlic dry extract 180 mg",
      "Garlic bulb ext. dry conc. 75 mg",
      "standardised to alliin 3 mg",
    ],
    directions: "Directions: 1-2 capsules 3 times daily with water, or as directed by your healthcare practitioner.",
    warnings: "Garlic may not suit people on blood-thinning medication, before surgery, or with bleeding disorders - check with her practitioner.",
    source: "biomedica.com.au (alliin standardisation); ingredient amounts and directions as listed by Australian stockists",
  },
  {
    id: "therapure-my-pms-support",
    brand: "Therapure",
    name: "my PMS support",
    form: "Capsule",
    aliases: ["theropure", "thera pure", "pms", "vitex", "chaste tree"],
    serving: { min: 1, max: 2, unit: "capsules", minDaily: 1, maxDaily: 2 },
    amounts: [
      "Chaste tree (Vitex) fruit ext. 125 mg (from 1.25 g)",
      "Passionflower herb top ext. 25 mg (from 500 mg)",
    ],
    directions: "Directions: Adults take 1-2 capsules once or twice per day, with or without food.",
    warnings: "Warning: Vitex agnus-castus may affect hormones and medicines such as oral contraceptives. Consult your health professional before use.",
    source: "therapure.com.au product page",
  },
  {
    id: "orthoplex-git-immunobiotic",
    brand: "Orthoplex White",
    name: "GIT ImmunoBiotic",
    form: "Powder",
    aliases: ["orthoplex", "git immuno biotic", "gitt", "immunobiotic", "boulardii", "glutamine"],
    serving: { min: 5, max: 5, unit: "g (1½ tsp) in water", minDaily: 2, maxDaily: 2 },
    amounts: [
      "Glutamine 2 g",
      "Slippery elm inner bark powder 500 mg",
      "Pectin 100 mg",
      "S. boulardii 5 billion CFU",
    ],
    directions: "Directions: Mix 5 g (approx. 1½ level 5 mL teaspoons) into water and consume immediately. Take twice daily, or as recommended by your healthcare practitioner. Store in the fridge (2-8°C).",
    warnings: "Warnings: If pregnant or likely to become pregnant, consult a health professional before use. If symptoms persist, talk to your health professional. Contains 130 mg sugar per maximum daily dose (10 g).",
    source: "bioconcepts.com.au (Orthoplex manufacturer) product page",
  },
];
