export type CatalogExercise = {
  name: string;
  muscleGroup: string;
  equipment: string;
};

const group = (muscleGroup: string, equipment: string, names: string[]): CatalogExercise[] =>
  names.map((name) => ({ name, muscleGroup, equipment }));

export const EXERCISE_CATALOG: CatalogExercise[] = [
  ...group("Klatka", "Sztanga", [
    "Wyciskanie sztangi na ławce płaskiej", "Wyciskanie sztangi na ławce dodatniej", "Wyciskanie sztangi na ławce ujemnej", "Wyciskanie sztangi wąskim chwytem", "Wyciskanie Spoto", "Wyciskanie Larsen", "Wyciskanie gilotynowe", "Floor press ze sztangą",
  ]),
  ...group("Klatka", "Hantle", [
    "Wyciskanie hantli na ławce płaskiej", "Wyciskanie hantli na ławce dodatniej", "Wyciskanie hantli na ławce ujemnej", "Rozpiętki z hantlami", "Wyciskanie hantli chwytem neutralnym", "Svend press", "Floor press z hantlami",
  ]),
  ...group("Klatka", "Maszyna", [
    "Chest press", "Wyciskanie na maszynie Hammer", "Rozpiętki na maszynie pec deck", "Wyciskanie jednorącz na maszynie",
  ]),
  ...group("Klatka", "Wyciąg", [
    "Krzyżowanie linek stojąc", "Krzyżowanie linek z dołu", "Krzyżowanie linek z góry", "Rozpiętki na bramie", "Wyciskanie jednorącz na wyciągu",
  ]),
  ...group("Klatka", "Masa ciała", ["Pompki klasyczne", "Pompki diamentowe", "Pompki z nogami na podwyższeniu", "Pompki na poręczach", "Pompki eksplozywne"]),

  ...group("Plecy", "Sztanga", [
    "Martwy ciąg klasyczny", "Martwy ciąg sumo", "Martwy ciąg z deficytu", "Martwy ciąg z podwyższenia", "Martwy ciąg rumuński", "Wiosłowanie sztangą", "Wiosłowanie Pendlay", "Wiosłowanie sztangą podchwytem", "T-bar row", "Good morning",
  ]),
  ...group("Plecy", "Hantle", [
    "Wiosłowanie hantlem jednorącz", "Wiosłowanie hantlami leżąc na ławce", "Seal row z hantlami", "Pullover z hantlem", "Renegade row", "Wiosłowanie Meadowsa",
  ]),
  ...group("Plecy", "Wyciąg", [
    "Ściąganie drążka wyciągu górnego", "Ściąganie drążka podchwytem", "Ściąganie uchwytu neutralnego", "Wiosłowanie na wyciągu siedząc", "Wiosłowanie jednorącz na wyciągu", "Straight-arm pulldown", "Face pull", "Ściąganie linki klęcząc",
  ]),
  ...group("Plecy", "Maszyna", ["Wiosłowanie na maszynie", "High row", "Low row", "Pullover na maszynie", "Wiosłowanie na maszynie Hammer"]),
  ...group("Plecy", "Drążek", ["Podciąganie nachwytem", "Podciąganie podchwytem", "Podciąganie chwytem neutralnym", "Podciąganie szerokim chwytem", "Podciąganie z obciążeniem", "Scapular pull-up"]),

  ...group("Nogi", "Sztanga", [
    "Przysiad ze sztangą high bar", "Przysiad ze sztangą low bar", "Przysiad przedni", "Przysiad Zerchera", "Przysiad do skrzyni", "Przysiad z pauzą", "Hack squat ze sztangą", "Wykroki ze sztangą", "Zakroki ze sztangą", "Bułgarski przysiad ze sztangą", "Martwy ciąg na prostych nogach",
  ]),
  ...group("Nogi", "Hantle", [
    "Goblet squat", "Wykroki z hantlami", "Zakroki z hantlami", "Bułgarski przysiad z hantlami", "Step-up z hantlami", "Martwy ciąg rumuński z hantlami", "Przysiad sumo z hantlem", "Przysiad kozacki z hantlem",
  ]),
  ...group("Nogi", "Maszyna", [
    "Suwnica leg press", "Hack squat na maszynie", "Prostowanie nóg na maszynie", "Uginanie nóg leżąc", "Uginanie nóg siedząc", "Uginanie nóg stojąc", "Przysiad na maszynie Smitha", "Wykroki na maszynie Smitha", "Belt squat", "Pendulum squat", "Maszyna na przywodziciele", "Maszyna na odwodziciele",
  ]),
  ...group("Nogi", "Masa ciała", ["Przysiad z masą ciała", "Przysiad bułgarski", "Wykroki chodzone", "Sissy squat", "Pistol squat", "Nordic curl", "Reverse Nordic curl", "Wall sit"]),

  ...group("Pośladki", "Sztanga", ["Hip thrust ze sztangą", "Glute bridge ze sztangą", "Martwy ciąg sumo na pośladki", "Frog pump ze sztangą"]),
  ...group("Pośladki", "Wyciąg", ["Kickback na wyciągu", "Pull-through na wyciągu", "Odwodzenie nogi na wyciągu"]),
  ...group("Pośladki", "Gumy", ["Monster walk", "Clamshell z gumą", "Odwodzenie kolan z gumą", "Glute bridge z gumą", "Fire hydrant z gumą"]),

  ...group("Łydki", "Maszyna", ["Wspięcia na palce stojąc", "Wspięcia na palce siedząc", "Wspięcia na palce na suwnicy", "Donkey calf raise"]),
  ...group("Łydki", "Hantle", ["Jednonóż wspięcia na palce z hantlem", "Wspięcia na palce z hantlami"]),
  ...group("Łydki", "Masa ciała", ["Wspięcia na palce jednonóż", "Tibialis raise", "Spacer na palcach"]),

  ...group("Barki", "Sztanga", [
    "Wyciskanie żołnierskie", "Push press", "Wyciskanie zza karku", "Wyciskanie sztangi siedząc", "Landmine press", "Wyciskanie Bradforda", "Podciąganie sztangi do brody",
  ]),
  ...group("Barki", "Hantle", [
    "Wyciskanie hantli siedząc", "Arnold press", "Unoszenie hantli bokiem", "Unoszenie hantli przodem", "Odwrotne rozpiętki z hantlami", "Unoszenie bokiem leżąc", "Wyciskanie hantla jednorącz", "Cuban press",
  ]),
  ...group("Barki", "Wyciąg", ["Unoszenie ramienia bokiem na wyciągu", "Odwrotne rozpiętki na bramie", "Face pull z rotacją", "Unoszenie ramion przodem na wyciągu", "Y-raise na wyciągu"]),
  ...group("Barki", "Maszyna", ["Shoulder press", "Unoszenie bokiem na maszynie", "Reverse pec deck"]),

  ...group("Biceps", "Sztanga", ["Uginanie ramion ze sztangą prostą", "Uginanie ramion ze sztangą EZ", "Drag curl", "Uginanie nachwytem ze sztangą"]),
  ...group("Biceps", "Hantle", ["Uginanie ramion z hantlami", "Uginanie młotkowe", "Uginanie na ławce skośnej", "Uginanie koncentryczne", "Zottman curl", "Cross-body hammer curl", "Spider curl z hantlami"]),
  ...group("Biceps", "Wyciąg", ["Uginanie ramion na wyciągu dolnym", "Bayesian curl", "Uginanie na modlitewniku z wyciągiem", "Uginanie linki nad głową"]),
  ...group("Biceps", "Maszyna", ["Uginanie na modlitewniku", "Biceps curl na maszynie"]),

  ...group("Triceps", "Sztanga", ["Wyciskanie francuskie leżąc", "Wyciskanie francuskie siedząc", "JM press", "California press"]),
  ...group("Triceps", "Hantle", ["Wyciskanie francuskie hantla oburącz", "Wyciskanie francuskie hantli leżąc", "Kickback z hantlem", "Tate press"]),
  ...group("Triceps", "Wyciąg", ["Prostowanie ramion z drążkiem", "Prostowanie ramion z liną", "Prostowanie ramienia jednorącz", "Prostowanie ramion nad głową", "Cross-body triceps extension"]),
  ...group("Triceps", "Masa ciała", ["Dipy na poręczach", "Dipy na ławce", "Pompki wąskie"]),

  ...group("Brzuch", "Masa ciała", [
    "Plank", "Side plank", "Dead bug", "Bird dog", "Hollow body hold", "Crunch", "Reverse crunch", "V-up", "Mountain climber", "Unoszenie nóg leżąc", "Unoszenie nóg w zwisie", "Unoszenie kolan w zwisie", "Dragon flag", "Russian twist", "Ab wheel rollout", "Bear crawl",
  ]),
  ...group("Brzuch", "Wyciąg", ["Cable crunch", "Pallof press", "Woodchopper z góry", "Woodchopper z dołu", "Unoszenie kolan z linką"]),
  ...group("Brzuch", "Obciążenie", ["Sit-up z obciążeniem", "Spacer farmera jednorącz", "Landmine rotation"]),

  ...group("Przedramiona", "Sztanga", ["Uginanie nadgarstków ze sztangą", "Uginanie nadgarstków nachwytem", "Zwijanie ciężaru na drążku"]),
  ...group("Przedramiona", "Hantle", ["Uginanie nadgarstków z hantlami", "Pronacja i supinacja z hantlem", "Farmer walk"]),
  ...group("Przedramiona", "Masa ciała", ["Zwis na drążku", "Zwis na ręcznikach"]),

  ...group("Całe ciało", "Kettlebell", ["Kettlebell swing", "Turkish get-up", "Kettlebell clean", "Kettlebell snatch", "Kettlebell press", "Kettlebell goblet squat", "Kettlebell windmill", "Kettlebell high pull"]),
  ...group("Całe ciało", "Sztanga", ["Clean", "Power clean", "Hang clean", "Snatch", "Power snatch", "Clean and jerk", "Thruster ze sztangą", "High pull ze sztangą"]),
  ...group("Całe ciało", "Masa ciała", ["Burpee", "Bear crawl", "Crab walk", "Inchworm", "Jumping jack", "Sprawl", "Box jump", "Skok w dal z miejsca"]),

  ...group("Cardio", "Maszyna", ["Bieżnia", "Rower stacjonarny", "Orbitrek", "Wioślarz", "SkiErg", "Stairmaster", "Air bike"]),
  ...group("Cardio", "Inne", ["Skakanka", "Sled push", "Sled pull", "Battle ropes", "Spacer farmera", "Marsz pod górę"]),

  ...group("Mobilność", "Masa ciała", ["90/90 hip switch", "World's greatest stretch", "Couch stretch", "Cat-cow", "Rotacja odcinka piersiowego", "Deep squat hold", "Scapular push-up", "Wall slide", "Rozciąganie zginaczy biodra", "Mobilizacja skokowego przy ścianie"]),
];
