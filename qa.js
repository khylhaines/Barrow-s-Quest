import { PINS } from "./pins.js";

/* =========================================================
   BARROW QUEST QA ENGINE
   MASTER MERGED VERSION
   - keeps current working structure
   - merges in larger content pools
   - improves variety
   - reduces repeat questions by widening candidate pools
========================================================= */

function normaliseTier(tier = "kid") {
  return ["kid", "teen", "adult"].includes(tier) ? tier : "kid";
}

function seededIndex(length, salt = 0) {
  if (!length) return 0;
  const n = Math.abs(Number(salt) || 0);
  return n % length;
}

function pickOne(arr, salt = 0) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[seededIndex(arr.length, salt)];
}

function shuffleSeeded(arr, salt = 0) {
  const out = [...arr];
  let seed = Math.abs(Number(salt) || Date.now());

  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = Math.floor((seed / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr || []) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function combinePools(...pools) {
  return uniqBy(
    pools.flat().filter(Boolean),
    (item) => {
      if (typeof item === "string") return `str:${item}`;
      if (item?.q && Array.isArray(item?.options)) return `mcq:${item.q}`;
      if (item?.q && item?.a) return `riddle:${item.q}|${item.a}`;
      return JSON.stringify(item);
    }
  );
}

function makePromptTask(prompt, mode = "activity") {
  return {
    q: prompt,
    options: ["DONE", "NOT YET", "SKIP", "UNSAFE"],
    answer: 0,
    fact: "",
    meta: { promptOnly: true, mode },
  };
}

function makeFallbackTask(message, meta = {}) {
  return {
    q: message,
    options: ["DONE", "NOT YET", "SKIP", "UNSAFE"],
    answer: 0,
    fact: "",
    meta: { fallback: true, ...meta },
  };
}

/* =========================================================
   LARGE MERGED GLOBAL CONTENT
========================================================= */

export const QUIZ_POOL_KID = [
  {
    q: "What was Furness Abbey mainly used for?",
    options: ["Living and praying", "Shopping", "Football", "Cinema"],
    answer: 0,
    fact: "Monks lived and prayed at Furness Abbey over 800 years ago.",
  },
  {
    q: "How old is Furness Abbey?",
    options: ["50 years", "100 years", "Over 800 years", "20 years"],
    answer: 2,
    fact: "It was founded in 1123.",
  },
  {
    q: "Who closed Furness Abbey?",
    options: ["A pirate", "King Henry VIII", "A mayor", "A farmer"],
    answer: 1,
    fact: "Henry VIII closed many monasteries in the 1500s.",
  },
  {
    q: "What colour stone is Furness Abbey made from?",
    options: ["Blue", "Red sandstone", "White marble", "Grey brick"],
    answer: 1,
    fact: "The red sandstone gives it its famous colour.",
  },
  {
    q: "Who lived at Furness Abbey?",
    options: ["Soldiers", "Monks", "Teachers", "Sailors"],
    answer: 1,
    fact: "Cistercian monks lived there.",
  },
  {
    q: "What made Barrow grow quickly in the 1800s?",
    options: ["Gold", "Iron ore", "Chocolate", "Oil"],
    answer: 1,
    fact: "Iron ore was discovered nearby in the 1840s.",
  },
  {
    q: "What does Barrow build today?",
    options: ["Cars", "Submarines", "Planes", "Tractors"],
    answer: 1,
    fact: "Submarines are still built in Barrow today.",
  },
  {
    q: "Where can you learn about shipbuilding history?",
    options: ["Dock Museum", "Park", "Beach", "Market"],
    answer: 0,
    fact: "The Dock Museum tells the story of Barrow’s shipbuilding.",
  },
  {
    q: "Did Barrow build ships during the World Wars?",
    options: ["Yes", "No"],
    answer: 0,
    fact: "Ships from Barrow served in both World Wars.",
  },
  {
    q: "Why were docks important?",
    options: ["Swimming", "Trade and ships", "Football", "Picnics"],
    answer: 1,
    fact: "The docks helped ships trade with the world.",
  },
  {
    q: "What connects Walney Island to Barrow?",
    options: ["Tunnel", "Bridge", "Helicopter", "Boat only"],
    answer: 1,
    fact: "Walney Bridge opened in 1908.",
  },
  {
    q: "What helps ships find their way near Walney?",
    options: ["Bonfires", "Lighthouse", "Flags", "Torches"],
    answer: 1,
    fact: "Walney Lighthouse guides ships safely.",
  },
  {
    q: "Is Walney an island?",
    options: ["Yes", "No"],
    answer: 0,
    fact: "Walney is one of England’s largest islands.",
  },
  {
    q: "What animals are common on Walney nature reserves?",
    options: ["Lions", "Birds", "Tigers", "Penguins"],
    answer: 1,
    fact: "Walney is famous for birdlife.",
  },
  {
    q: "What can you see at Earnse Bay?",
    options: ["Volcano", "Skyscrapers", "Sunsets", "Desert"],
    answer: 2,
    fact: "Earnse Bay is known for beautiful sunsets.",
  },
  {
    q: "What building shows Barrow’s civic pride?",
    options: ["Town Hall", "Supermarket", "Garage", "Cinema"],
    answer: 0,
    fact: "Barrow Town Hall opened in 1887.",
  },
  {
    q: "Who was Emlyn Hughes?",
    options: ["Footballer", "Sailor", "King", "Monk"],
    answer: 0,
    fact: "He was a famous footballer born in Barrow.",
  },
  {
    q: "What does the cenotaph remember?",
    options: ["Shopping days", "War heroes", "Festivals", "Markets"],
    answer: 1,
    fact: "The cenotaph honours those lost in war.",
  },
  {
    q: "What type of ships are built in Barrow today?",
    options: ["Fishing boats", "Submarines", "Cruise ships", "Yachts"],
    answer: 1,
    fact: "Modern submarines are built here.",
  },
  {
    q: "What helped move iron around Britain?",
    options: ["Bikes", "Railways", "Boats only", "Planes"],
    answer: 1,
    fact: "The Furness Railway helped transport iron.",
  },
  {
    q: "What kind of town was Barrow before industry?",
    options: ["Village", "Capital city", "Theme park", "Port only"],
    answer: 0,
    fact: "It was a small village before iron was found.",
  },
  {
    q: "What made Barrow famous worldwide?",
    options: ["Theme parks", "Shipbuilding", "Chocolate", "Gold"],
    answer: 1,
    fact: "Shipbuilding put Barrow on the map.",
  },
  {
    q: "What sits on Piel Island?",
    options: ["Castle", "Skyscraper", "Mall", "Airport"],
    answer: 0,
    fact: "Piel Castle was built to protect the coast.",
  },
  {
    q: "Why was Piel Castle built?",
    options: ["To protect coast", "For football", "For school", "For shopping"],
    answer: 0,
    fact: "It defended against attacks from the sea.",
  },
  {
    q: "What is the Dock Museum shaped like?",
    options: ["Ship", "Castle", "Plane", "Car"],
    answer: 0,
    fact: "It’s shaped like a ship.",
  },
  {
    q: "What sea is near Barrow?",
    options: ["North Sea", "Morecambe Bay", "Atlantic only", "Mediterranean"],
    answer: 1,
    fact: "Barrow sits beside Morecambe Bay.",
  },
  {
    q: "What happens with tides in Morecambe Bay?",
    options: ["Stay still", "Move quickly", "Freeze", "Disappear"],
    answer: 1,
    fact: "The tides are powerful and move fast.",
  },
  {
    q: "What year was Town Hall opened?",
    options: ["1887", "2001", "1750", "1920"],
    answer: 0,
    fact: "It opened during Queen Victoria’s reign.",
  },
  {
    q: "What kind of island is Walney?",
    options: [
      "One of the largest in England",
      "Tiny rock",
      "Floating island",
      "Secret island",
    ],
    answer: 0,
    fact: "Walney is one of England’s largest islands.",
  },
  {
    q: "What kind of class is Astute?",
    options: [
      "Submarine class",
      "School class",
      "Ship class only",
      "Plane class",
    ],
    answer: 0,
    fact: "Astute-class submarines are built in Barrow.",
  },
];

export const HISTORY_POOL_KID = [
  {
    q: "What was Furness Abbey mainly used for?",
    options: ["Living and praying", "Shopping", "Football", "Cinema"],
    answer: 0,
    fact: "Monks lived and prayed at Furness Abbey over 800 years ago.",
  },
  {
    q: "How old is Furness Abbey?",
    options: ["50 years", "100 years", "Over 800 years", "20 years"],
    answer: 2,
    fact: "It was founded in 1123.",
  },
  {
    q: "Who closed Furness Abbey?",
    options: ["A pirate", "King Henry VIII", "A mayor", "A farmer"],
    answer: 1,
    fact: "Henry VIII closed many monasteries in the 1500s.",
  },
  {
    q: "What made Barrow grow quickly in the 1800s?",
    options: ["Gold", "Iron ore", "Chocolate", "Oil"],
    answer: 1,
    fact: "Iron ore was discovered nearby in the 1840s.",
  },
  {
    q: "Where can you learn about shipbuilding history?",
    options: ["Dock Museum", "Park", "Beach", "Market"],
    answer: 0,
    fact: "The Dock Museum tells the story of Barrow’s shipbuilding.",
  },
  {
    q: "What does the cenotaph remember?",
    options: ["Shopping days", "War heroes", "Festivals", "Markets"],
    answer: 1,
    fact: "The cenotaph honours those lost in war.",
  },
];

export const RIDDLE_POOL = [
  { q: "What has keys but can’t open locks?", a: "A piano" },
  { q: "What has hands but can’t clap?", a: "A clock" },
  { q: "What gets wetter the more it dries?", a: "A towel" },
  { q: "I go up and down but never move. What am I?", a: "Stairs" },
  { q: "What has one eye but can’t see?", a: "A needle" },
  { q: "What has a neck but no head?", a: "A bottle" },
  { q: "What runs but never walks?", a: "Water" },
  { q: "What has many teeth but cannot bite?", a: "A comb" },
  { q: "What can you catch but not throw?", a: "A cold" },
  {
    q: "The more you take, the more you leave behind. What am I?",
    a: "Footsteps",
  },
  { q: "What comes down but never goes up?", a: "Rain" },
  { q: "What has cities but no houses?", a: "A map" },
  { q: "What can fill a room but takes up no space?", a: "Light" },
  { q: "What goes up but never comes down?", a: "Your age" },
  { q: "What is full of holes but still holds water?", a: "A sponge" },
  { q: "What is always coming but never arrives?", a: "Tomorrow" },
  { q: "What can’t be used until it’s broken?", a: "An egg" },
  { q: "What disappears when you say its name?", a: "Silence" },
  { q: "What has a ring but no finger?", a: "A phone" },
  { q: "What has branches but no leaves?", a: "A bank" },
];

export const SPEED_POOL = {
  kid: [
    "10-Second Scan: Point to the nearest tree, bin, or sign.",
    "Statue Freeze: Freeze like a statue for 7 seconds.",
    "Colour Hunt: Find something red fast.",
    "Shape Spot: Find a circle quickly.",
    "Animal Ears: Make an animal pose for 5 seconds.",
    "Quiet Ninja: Walk 10 silent steps.",
    "Superhero Landing: Do a safe superhero landing pose.",
    "Count It: Count 5 steps forward, 5 back.",
    "Quick Smile: Do your best explorer face.",
    "Rock Paper Speed: Rock-paper-scissors best of 1.",
    "Shadow Spot: Find your shadow fast.",
    "Hop Count: Hop 3 times safely.",
    "Tall Small: Stretch tall, then crouch small.",
    "Wind Check: Feel the wind and point where it’s coming from.",
    "Quick Draw Air: Draw a star in the air.",
    "Fast Balance: Balance on one foot for 5 seconds.",
    "Find a Number: Spot any number quickly.",
    "Mirror Move: Copy the other person’s move.",
    "Traffic Light: Freeze, walk, slow.",
    "Quick Team Pose: Make a team pose in 5 seconds.",
  ],
  teen: [
    "Main Character Walk: 10 steps like you’re in a trailer.",
    "Photo Angle Switch: Low-angle pose then high-angle pose.",
    "Sound ID: Name the loudest sound you hear.",
    "One-Line Trailer: Finish 'In a world where…'",
    "Stealth Meter: 10 stealth steps.",
    "Speed Slogan: Invent a slogan for this place.",
    "Boss Intro: Say a boss name for this area.",
    "NPC Quote: Say a clean NPC quote.",
    "Zone Buff Pick: Choose a buff instantly.",
    "Fast Footwork: 6 quick side-steps.",
    "Find the Vibe: This place feels…",
    "Clue Spot: Find something that looks like a clue.",
    "Speed Memory: Look, turn away, name 3 things.",
    "Walk Like: Pirate, robot, or ninja.",
    "Fast Choice: Safe shortcut or scenic route.",
    "Character Swap: Swap who’s leader instantly.",
    "Landmark Judge: Rate this landmark 1–10.",
    "Quick Roleplay: Guard, Scout, or Wizard.",
    "Fast Team Plan: Next objective in 3 words.",
    "Boss Weakness: Pick a weakness fast.",
  ],
  adult: [
    "30-Second Observation: Name 3 details you’d miss if you rushed.",
    "History Snap: Guess the oldest-looking thing nearby and why.",
    "Micro-Route: Choose next waypoint based on safety or fun.",
    "One-Word Theme: Industry, Faith, Nature, or Memory.",
    "Fast Risk Check: Name 1 hazard and 1 safe alternative.",
    "Story Hook: Finish 'A monk hid…'",
    "Logic Switch: Is a shortcut always best?",
    "3-Point Scan: Exits, hazards, meeting point.",
    "Quick Time Guess: Guess the time without checking your phone.",
    "Treasure Math: If each node is 120 points, how many for 5?",
    "Fast Prioritise: Photo, clue, or rest.",
    "Atmosphere Read: Peaceful, tense, busy, eerie.",
    "Design Eye: What would make this place more questy?",
    "Ethical Choice: Respect or explore first?",
    "Historical Guess: What job might someone here have had in 1850?",
    "Boss Lore: Create a boss name and 1-line lore.",
    "Fast Constraint: Plan next 2 pins with a no-roads rule.",
    "Micro-Meditation: 10 seconds calm breathing.",
    "Detective Eye: What could hide a code here?",
    "Reward Logic: Coins, clue, map fragment, or key?",
  ],
};

export const BATTLE_POOL = {
  kid: [
    "Race: First to point at something green wins.",
    "Balance Duel: Who can stand on one foot longest?",
    "Speed Point: First to point at the tallest thing wins.",
    "Rock-paper-scissors battle.",
    "Echo Battle: First to repeat the location name wins.",
    "Shadow Duel: First to step on someone’s shadow wins.",
    "Animal Sound Battle: Funniest animal noise wins.",
    "Treasure Grab: First to touch something metal wins.",
    "Quick Count: First to count 5 steps wins.",
    "Pose Duel: Best superhero pose wins.",
    "Statue Battle: Last person to move wins.",
    "Hop Race: First to do 3 hops wins.",
    "Shape Race: First to find a circle wins.",
    "Smile Battle: Biggest smile wins.",
    "Victory Cheer: Loudest cheer wins.",
  ],
  teen: [
    "Reaction Duel: Leader claps, first to clap back wins.",
    "Speed Debate: Best 3-word slogan wins.",
    "Balance Battle: Last standing on one foot wins.",
    "Stealth Walk: Quietest 10 steps wins.",
    "Speed Riddle: First answer wins.",
    "Point Race: First to spot something historic wins.",
    "Rock-paper-scissors best of 3.",
    "Sound Spot: First to name the loudest sound wins.",
    "Memory Flash: Name 3 things after a quick look.",
    "Mini Story: Best 1-line story wins.",
    "Explorer Command: Fastest to obey the command wins.",
    "Soundtrack Duel: Best soundtrack idea wins.",
    "Explorer Pose Duel.",
    "Quick Compliment Duel.",
    "Victory Pose Duel.",
  ],
  adult: [
    "Observation Duel: First to name 3 details wins.",
    "Logic Duel: First correct answer wins.",
    "Memory Duel: First to recall 4 objects wins.",
    "Strategy Duel: Best plan in one sentence wins.",
    "History Guess Duel.",
    "Navigation Duel: Point safest direction.",
    "Fast Risk Spot: Identify hazard fastest.",
    "Treasure Logic Duel.",
    "Perspective Duel: Best insight wins.",
    "Design Idea Duel.",
    "Story Duel: Best quick story wins.",
    "Location Theme Duel.",
    "Route Planning Duel.",
    "Historical Role Guess Duel.",
    "Time Guess Duel.",
  ],
};

export const FAMILY_POOL = {
  kid: [
    "Team Wave: Everyone do a big explorer wave together.",
    "Animal Parade: Each person do a different animal pose.",
    "Colour Hunt Team: Together find something blue.",
    "Explorer Echo: One says mission, the others say accepted.",
    "Funny Walk Race: Do 5 silly steps together.",
    "Freeze Squad: Everyone freeze like statues.",
    "Treasure Point: All point at the most interesting thing nearby.",
    "Team Smile: Biggest smiles for 3 seconds.",
    "Shadow Team: Stand together and look for your shadows.",
    "Superhero Group Pose: Make a family hero pose.",
    "Quiet Mission: Walk 5 silent steps together.",
    "Mini March: March in place like explorers.",
    "Nature Team: Together find something green.",
    "Fast Count: Count to 10 together.",
    "Robot Team: Walk like robots for 5 seconds.",
    "Treasure Guard Circle: Guard invisible treasure.",
    "One-Word Family Vibe: Each person says one word.",
    "Team Hop: Hop 3 times together.",
    "Explorer Hands: High-five or thumbs-up all round.",
    "Victory Cheer: Make a family cheer together.",
  ],
  teen: [
    "Team Trailer Walk: 10 steps like your squad is in a game intro.",
    "Role Select: Pick roles fast — Scout, Tank, Healer, Guide.",
    "Group Poster Pose: Make a dramatic team pose.",
    "One-Line Team Motto: Invent a squad motto fast.",
    "Fast Debate: Best family power-up here?",
    "Vibe Call: Calm, weird, epic, or busy?",
    "Stealth Family: 8 quiet steps together.",
    "Emoji Match Team: Pick 2 emojis that fit this place.",
    "Boss Warning: Invent a warning for this area.",
    "Fast Memory Team: Name 3 things together.",
    "Squad Formation: Stand in a triangle or line.",
    "Quick Story: Make a 2-sentence story together.",
    "Photo Pose Practice: Do a clean team pose.",
    "Zone Call: Civic, Nature, Docks, or Ruins?",
    "Hero Landing Team: Safe dramatic landing pose.",
    "Fast Team Safety: Point to the best meeting spot.",
    "Mini Challenge Plan: Say the next objective in 3 words.",
    "Boss Name Team: Invent a boss name for this place.",
    "Adventure Voice: Say quest complete dramatically.",
    "Group Win Pose: Final team victory pose.",
  ],
  adult: [
    "Family Check-In: Each person says one word for how they feel.",
    "Micro-Reflection: Name one thing you noticed because you slowed down.",
    "History Guess Team: Guess what happened here long ago.",
    "Safety Scan: Identify a meeting point nearby.",
    "Shared Focus: Spend 5 seconds noticing details silently.",
    "Route Decision: Pick the next route based on fun or safety.",
    "Family Briefing: Explain the next objective in 10 words.",
    "Quick Gratitude: Each person name one good thing about today.",
    "Memory Spark: Say what this place reminds you of.",
    "Observation Team: Name 3 details most people would miss.",
    "Mini Story Build: Each person adds one sentence.",
    "Energy Check: Decide if the group needs rest, pace, or fun.",
    "Quiet Minute Lite: 10 seconds calm breathing together.",
    "Treasure Logic: If this place held a clue, where would it be hidden?",
    "Quick Design Eye: What would make this place more magical for kids?",
    "Historic Imagination: What job might someone here have done?",
    "Atmosphere Read: Peaceful, busy, eerie, or proud?",
    "Group Focus Reset: 3 slow breaths, then continue.",
    "Reflective Prompt: What part of today has been best so far?",
    "Respect Check: How do we explore this place respectfully?",
  ],
};

export const ACTIVITY_POOL = {
  kid: [
    "HOME BASE: Create a secret team handshake.",
    "MORRISONS: Spot something red in 10 seconds.",
    "SALTHOUSE MILLS: March like a factory boss.",
    "CENOTAPH: Give a respectful salute.",
    "BANDSTAND: March up the steps like a hero.",
    "PARK RAILWAY: Pretend you're the conductor.",
    "BOATING LAKE: Count 3 ducks or birds.",
    "BRIDGEGATE: Point which way you’d explore.",
    "FRYERS LANE: Spot something old.",
    "FLASHLIGHT BEND: Walk quietly for 10 steps.",
    "RED RIVER WALK: Count 5 steps slowly.",
    "FURNESS ABBEY: Pretend you're a medieval guard.",
    "DOCK MUSEUM: Pretend to steer a ship.",
    "TOWN HALL CLOCK: Count down from 5.",
    "CUSTOM HOUSE: Pretend to check passports.",
    "THE FORUM: Pretend you're on stage.",
    "LIBRARY: Whisper a fun fact.",
    "HENRY SCHNEIDER: Stand strong like a statue.",
    "JAMES RAMSDEN: Give a short mayor speech.",
    "OLD FIRE STATION: Pretend to spray a hose.",
    "MARKET HALL: Spot something colourful.",
    "DUKE OF EDINBURGH: Name your favourite drink.",
    "EMLYN HUGHES: Do a mini goal celebration.",
    "GRAVING DOCK: Pretend to hammer metal.",
    "SLAG BANK: Climb safely and look around.",
  ],
  teen: [
    "Do a 10-second main character walk.",
    "Take a poster pose angle.",
    "Make up a 1-line slogan for this spot.",
    "Do a stealth-walk 10 steps.",
    "Pick the most industrial sound you can hear.",
    "Film a 3-second aesthetic clip.",
    "Give one plant a superhero name.",
    "Do a calm-breath reset.",
    "Find wind direction and do a storm survivor pose.",
    "Invent a fake legend about this place.",
    "Pick a doorway and pose like you’re entering a boss arena.",
    "Point toward town and do a scout report.",
    "Choose the best viewpoint and rate it.",
    "Do a silent NPC idle animation.",
    "Pick a street name and remix it into a rap line.",
  ],
  adult: [
    "Create an elite squad name right now.",
    "Find the weirdest product label.",
    "Strike a dramatic industrial pose.",
    "10 seconds silence, then say one word.",
    "Deliver a 5-second hype speech.",
    "Narrate this place like a vlog intro.",
    "Invent a dramatic backstory for a boat.",
    "Choose the most chaotic direction and defend it.",
    "Give an abandoned object a story.",
    "Do a dramatic slow turn like you're being followed.",
    "Rate the vibe 1 to 10 and justify it.",
    "Imagine this place 800 years ago. What changes?",
    "Name a metal band after this location.",
    "If you could rewind 1 hour, would you?",
    "Movie trailer voice: In a town where…",
    "Pick a random word and create a conspiracy theory.",
    "Hero or villain origin story?",
    "Give a 10-second political speech.",
    "Invent a ridiculous emergency.",
    "If this was a battle arena, what's the boss?",
  ],
};

/* =========================================================
   CURRENT ZONE STRUCTURE
========================================================= */

export const QA_BY_ZONE = {
  core: {
    quiz: {
      kid: [
        {
          q: "What is Barrow-in-Furness known for building today?",
          options: [
            "Submarines",
            "Chocolate castles",
            "Dragon ships",
            "Flying tractors",
          ],
          answer: 0,
          fact: "Barrow is famous for submarine building.",
        },
      ],
      teen: [
        {
          q: "Which industry helped Barrow grow rapidly in the 1800s?",
          options: [
            "Iron and shipbuilding",
            "Banana farming",
            "Rocket science",
            "Wizard training",
          ],
          answer: 0,
          fact: "Iron and shipbuilding were central to Barrow’s growth.",
        },
      ],
      adult: [
        {
          q: "What transformed Barrow from a small settlement into an industrial town?",
          options: [
            "Iron, docks, and shipbuilding",
            "Gold mining",
            "A royal palace",
            "A giant duck invasion",
          ],
          answer: 0,
          fact: "Barrow grew through industrial development linked to iron and shipbuilding.",
        },
      ],
    },

    history: {
      kid: [
        {
          q: "Was Barrow always a big town?",
          options: [
            "No, it started as a small village",
            "Yes, always huge",
            "It started as a castle",
            "It was built by pirates",
          ],
          answer: 0,
          fact: "Barrow was once a small village before industrial growth.",
        },
      ],
      teen: [
        {
          q: "Why is Barrow important in British industrial history?",
          options: [
            "Shipbuilding and heavy industry",
            "It invented pizza",
            "It was England’s first airport",
            "It trained racing sheep",
          ],
          answer: 0,
          fact: "Barrow played a major role in heavy industry and shipbuilding.",
        },
      ],
      adult: [
        {
          q: "What best describes Barrow’s historic importance?",
          options: [
            "A major industrial and shipbuilding centre",
            "A medieval capital city",
            "A seaside fishing village only",
            "A hidden Roman circus town",
          ],
          answer: 0,
          fact: "Barrow became a major industrial and shipbuilding centre.",
        },
      ],
    },

    logic: {
      kid: [
        { q: "What has keys but can’t open locks?", a: "A piano" },
        { q: "What gets wetter the more it dries?", a: "A towel" },
      ],
      teen: [
        { q: "What disappears when you say its name?", a: "Silence" },
        { q: "What has a ring but no finger?", a: "A phone" },
      ],
      adult: [
        { q: "What belongs to you but others use it more?", a: "Your name" },
        { q: "What is always coming but never arrives?", a: "Tomorrow" },
      ],
    },

    activity: {
      kid: [
        "Point to the oldest-looking thing nearby.",
        "Do an explorer pose for 5 seconds.",
      ],
      teen: ["Give this place a dramatic 3-word title."],
      adult: ["Notice 3 details most people would miss here."],
    },

    family: {
      kid: ["Make a family team pose together."],
      teen: ["Create a 3-word team motto."],
      adult: ["Each person says one word about this place."],
    },

    battle: {
      kid: ["Quick Duel: First to spot something red wins."],
      teen: ["Fast Debate: Best slogan wins."],
      adult: ["Observation Duel: First to name 3 details wins."],
    },

    speed: {
      kid: ["10-Second Scan: Spot a sign, tree, or bench."],
      teen: ["Do 10 silent steps."],
      adult: [
        "30-Second Observation: Name 3 details you'd miss if you rushed.",
      ],
    },

    ghost: { kid: [], teen: [], adult: [] },

    boss: {
      kid: [
        {
          q: "What makes Barrow special?",
          options: [
            "Its stories, industry, and landmarks",
            "Only ducks",
            "Only ice cream",
            "A secret moon base",
          ],
          answer: 0,
          fact: "Barrow is special because of its history, places, and industries.",
        },
      ],
      teen: [
        {
          q: "What connects many of Barrow’s landmarks?",
          options: [
            "Industry, memory, and local history",
            "Volcanoes",
            "Tropical jungles",
            "Wizard football",
          ],
          answer: 0,
          fact: "Many Barrow landmarks reflect local industry, memory, and history.",
        },
      ],
      adult: [
        {
          q: "What is the best way to describe Barrow’s heritage?",
          options: [
            "A town shaped by industry, memory, and place",
            "A lost Roman capital",
            "A farming-only village",
            "A floating harbour kingdom",
          ],
          answer: 0,
          fact: "Barrow’s heritage combines industrial history, civic identity, and local memory.",
        },
      ],
    },
  },

  abbey: {
    quiz: {
      kid: [
        {
          q: "Who lived at Furness Abbey long ago?",
          options: ["Monks", "Pirates", "Astronauts", "Robots"],
          answer: 0,
          fact: "Monks lived and worshipped at Furness Abbey.",
        },
      ],
      teen: [
        {
          q: "What kind of place was Furness Abbey?",
          options: [
            "A monastery",
            "A football ground",
            "A shopping centre",
            "A train station",
          ],
          answer: 0,
          fact: "Furness Abbey was a monastery.",
        },
      ],
      adult: [
        {
          q: "What was the main historic role of Furness Abbey?",
          options: [
            "Religious life and monastic power",
            "Air travel",
            "Modern retail",
            "Ship launching",
          ],
          answer: 0,
          fact: "The abbey was a major religious and monastic site.",
        },
      ],
    },

    history: {
      kid: [
        {
          q: "Is Furness Abbey very old?",
          options: ["Yes", "No", "Only 20 years old", "Built last week"],
          answer: 0,
          fact: "Furness Abbey is hundreds of years old.",
        },
      ],
      teen: [
        {
          q: "What gives the abbey its strong atmosphere?",
          options: [
            "Ruins and history",
            "Shopping signs",
            "Airport lights",
            "Factory smoke",
          ],
          answer: 0,
          fact: "Its ruins and long history give it atmosphere.",
        },
      ],
      adult: [
        {
          q: "Why is Furness Abbey historically significant?",
          options: [
            "It reflects religious power and change",
            "It was a motorway junction",
            "It was a cinema complex",
            "It was a submarine dock",
          ],
          answer: 0,
          fact: "Furness Abbey reflects major religious and political change.",
        },
      ],
    },

    logic: {
      kid: [{ q: "What has many teeth but cannot bite?", a: "A comb" }],
      teen: [{ q: "What goes up but never comes down?", a: "Your age" }],
      adult: [{ q: "What can fill a room but takes up no space?", a: "Light" }],
    },

    activity: {
      kid: ["Pretend you are a medieval guard."],
      teen: ["Give this ruin a dramatic title."],
      adult: ["Notice 3 details that make this place feel ancient."],
    },

    family: {
      kid: ["Make a knight team pose together."],
      teen: ["Invent a team motto for the abbey."],
      adult: ["Each person says one word about the atmosphere here."],
    },

    battle: {
      kid: ["Quick Duel: First to point at old stone wins."],
      teen: ["Fast Debate: Best abbey slogan wins."],
      adult: ["Observation Duel: Name 3 old features fastest."],
    },

    speed: {
      kid: ["10-Second Scan: Spot an arch, wall, or path."],
      teen: ["Do 10 quiet explorer steps."],
      adult: ["30-Second Observation: Name 3 ancient details."],
    },

    ghost: {
      kid: ["Stand still like you heard a ghost whisper."],
      teen: ["Name one thing that makes this place eerie."],
      adult: ["Describe the atmosphere here in one word."],
    },

    boss: {
      kid: [
        {
          q: "What kind of place was Furness Abbey?",
          options: [
            "A medieval monastery",
            "A shopping centre",
            "A football stadium",
            "A submarine dock",
          ],
          answer: 0,
          fact: "Furness Abbey was a medieval monastery.",
        },
      ],
      teen: [
        {
          q: "What ended the abbey’s great power?",
          options: [
            "The Dissolution of the Monasteries",
            "A dragon",
            "A football riot",
            "A railway crash",
          ],
          answer: 0,
          fact: "The Dissolution of the Monasteries ended its power.",
        },
      ],
      adult: [
        {
          q: "What does Furness Abbey best symbolise?",
          options: [
            "Religious power, memory, and change",
            "Modern tourism only",
            "Heavy industry only",
            "Airport expansion",
          ],
          answer: 0,
          fact: "The abbey symbolises religious power, memory, and change.",
        },
      ],
    },
  },

  park: {
    quiz: {
      kid: [
        {
          q: "What kind of place is Barrow Park?",
          options: ["A park", "A harbour", "A factory", "An airport"],
          answer: 0,
          fact: "Barrow Park is one of the town’s big green spaces.",
        },
      ],
      teen: [
        {
          q: "What makes the park good for adventure quests?",
          options: [
            "Open space, landmarks, and routes",
            "Cargo cranes",
            "Runways",
            "Only shops",
          ],
          answer: 0,
          fact: "The park suits quests because it has open space and landmarks.",
        },
      ],
      adult: [
        {
          q: "What makes Barrow Park suitable for exploration gameplay?",
          options: [
            "Varied landmarks and open route design",
            "Submarine launch bays",
            "Deep sea access",
            "Rail freight yards",
          ],
          answer: 0,
          fact: "The park has varied landmarks and a strong route layout.",
        },
      ],
    },

    history: {
      kid: [
        {
          q: "What can a park help people do?",
          options: [
            "Play and relax",
            "Launch rockets",
            "Mine iron",
            "Build ships",
          ],
          answer: 0,
          fact: "Parks help people play, walk, and relax.",
        },
      ],
      teen: [
        {
          q: "Why do parks matter in towns?",
          options: [
            "They create shared public space",
            "They replace roads",
            "They power factories",
            "They train pilots",
          ],
          answer: 0,
          fact: "Parks matter because they create shared public space.",
        },
      ],
      adult: [
        {
          q: "What public role does a park often serve?",
          options: [
            "Leisure, memory, and social space",
            "Heavy freight movement",
            "Border control",
            "Industrial storage",
          ],
          answer: 0,
          fact: "Parks often serve as leisure, memory, and social space.",
        },
      ],
    },

    logic: {
      kid: [{ q: "What has hands but can’t clap?", a: "A clock" }],
      teen: [{ q: "What can you catch but not throw?", a: "A cold" }],
      adult: [{ q: "What has cities but no houses?", a: "A map" }],
    },

    activity: {
      kid: ["Do a superhero landing pose."],
      teen: ["Walk like the main character for 10 steps."],
      adult: ["Notice 3 details most people rush past here."],
    },

    family: {
      kid: ["Make a family explorer pose."],
      teen: ["Invent a squad motto for this park."],
      adult: ["Each person says one word that fits the park."],
    },

    battle: {
      kid: ["Quick Duel: First to point at something green wins."],
      teen: ["Fast Debate: Best 3-word park title wins."],
      adult: ["Observation Duel: Name 3 nearby details fastest."],
    },

    speed: {
      kid: ["10-Second Scan: Spot a tree, bench, or flower."],
      teen: ["Do 8 stealth steps."],
      adult: ["30-Second Observation: Name 3 features quickly."],
    },

    ghost: {
      kid: ["Freeze like a statue for 5 seconds."],
      teen: ["Say one thing that feels mysterious here."],
      adult: ["Describe this place in one atmospheric word."],
    },

    boss: {
      kid: [
        {
          q: "What makes a park adventure fun?",
          options: [
            "Exploring and finding things",
            "Only standing still",
            "Only shopping",
            "Only traffic",
          ],
          answer: 0,
          fact: "Park adventure is about exploring and finding things.",
        },
      ],
      teen: [
        {
          q: "What links many park missions together?",
          options: [
            "Movement, observation, and discovery",
            "Cargo loading",
            "Airport security",
            "Factory shifts",
          ],
          answer: 0,
          fact: "Park missions often combine movement, observation, and discovery.",
        },
      ],
      adult: [
        {
          q: "What best describes the park quest experience?",
          options: [
            "A layered exploration of leisure, memory, and challenge",
            "A rail freight simulator",
            "A harbour traffic system",
            "A retail layout test",
          ],
          answer: 0,
          fact: "The park quest combines leisure, memory, and challenge.",
        },
      ],
    },
  },
};

/* =========================================================
   SPECIAL PIN OVERRIDES
========================================================= */

export const QA_PIN_OVERRIDES = {
  abbey_boss: {
    boss: {
      kid: [
        {
          q: "Final Abbey Trial: Who lived here long ago?",
          options: [
            "Monks",
            "Aliens",
            "Pirates",
            "A secret gang of time-travelling cheese wizards",
          ],
          answer: 0,
          fact: "Monks lived at Furness Abbey for centuries.",
        },
      ],
      teen: [
        {
          q: "FINAL BOSS: What event ended the abbey’s power?",
          options: [
            "The Dissolution of the Monasteries",
            "A volcano",
            "A railway crash",
            "A football riot",
          ],
          answer: 0,
          fact: "The Dissolution of the Monasteries ended its power.",
        },
      ],
      adult: [
        {
          q: "FINAL BOSS: What does Furness Abbey most strongly represent?",
          options: [
            "Religious power, memory, and political change",
            "Modern retail expansion",
            "Airport growth",
            "Naval weapons testing",
          ],
          answer: 0,
          fact: "It represents religious power, memory, and political change.",
        },
      ],
    },
  },

  park_boss_bandstand: {
    boss: {
      kid: [
        {
          q: "What is a bandstand mainly used for?",
          options: [
            "Music and performances",
            "Fixing tractors",
            "Rocket launches",
            "Fishing boats",
          ],
          answer: 0,
          fact: "Bandstands are used for music and performances.",
        },
      ],
      teen: [
        {
          q: "BOSS: Festival Revival! What atmosphere fits this place best?",
          options: [
            "Performance and celebration",
            "Heavy industry",
            "Silent prayer only",
            "Airport security",
          ],
          answer: 0,
          fact: "This boss is tied to performance and celebration.",
        },
      ],
      adult: [
        {
          q: "BOSS: Festival Revival! What public role does a bandstand often symbolise?",
          options: [
            "Shared entertainment and gathering",
            "Freight shipping",
            "Border defence",
            "Agricultural storage",
          ],
          answer: 0,
          fact: "Bandstands often symbolise gathering and entertainment.",
        },
      ],
    },
  },

  park_boss_cenotaph: {
    boss: {
      kid: [
        {
          q: "BOSS: Memory Keeper! What does the cenotaph honour?",
          options: [
            "Those lost in war",
            "Football winners",
            "Train drivers",
            "Shop owners",
          ],
          answer: 0,
          fact: "The cenotaph honours those lost in war.",
        },
      ],
      teen: [
        {
          q: "BOSS: Memory Keeper! Why should this place be treated respectfully?",
          options: [
            "It is a memorial space",
            "It is a car park",
            "It is a skate zone",
            "It is a market lane",
          ],
          answer: 0,
          fact: "It is a memorial space for remembrance.",
        },
      ],
      adult: [
        {
          q: "BOSS: Memory Keeper! What civic purpose does a cenotaph serve?",
          options: [
            "Collective remembrance",
            "Retail promotion",
            "Cargo storage",
            "Ticket inspection",
          ],
          answer: 0,
          fact: "It serves collective remembrance.",
        },
      ],
    },
  },

  park_boss_skate: {
    boss: {
      kid: [
        {
          q: "BOSS: Park Champion! What matters most during a challenge?",
          options: [
            "Trying your best safely",
            "Cheating fast",
            "Giving up",
            "Ignoring everyone",
          ],
          answer: 0,
          fact: "The best win is doing your best safely.",
        },
      ],
      teen: [
        {
          q: "BOSS: Park Champion! What makes a strong challenger?",
          options: [
            "Confidence and control",
            "Chaos only",
            "Running away",
            "Breaking rules",
          ],
          answer: 0,
          fact: "A strong challenger shows confidence and control.",
        },
      ],
      adult: [
        {
          q: "BOSS: Park Champion! What does challenge mode reward most?",
          options: [
            "Skill, movement, and effort",
            "Noise only",
            "Stillness only",
            "Luck alone",
          ],
          answer: 0,
          fact: "Challenge mode rewards effort and skill.",
        },
      ],
    },
  },

  park_boss_mudman: {
    boss: {
      kid: [
        {
          q: "BOSS: Mudman Mystery! What best fits a mystery boss?",
          options: [
            "Clues and careful thinking",
            "Only shouting",
            "Only running",
            "Only sleeping",
          ],
          answer: 0,
          fact: "Mystery bosses are about clues and thinking.",
        },
      ],
      teen: [
        {
          q: "BOSS: Mudman Mystery! What wins a mystery challenge?",
          options: [
            "Observation and logic",
            "Random guessing only",
            "Ignoring clues",
            "Walking away",
          ],
          answer: 0,
          fact: "Observation and logic win mystery challenges.",
        },
      ],
      adult: [
        {
          q: "BOSS: Mudman Mystery! What makes mystery pins satisfying?",
          options: [
            "Pattern, clue, and reveal",
            "Pure noise",
            "Fast driving",
            "Ticket scanning",
          ],
          answer: 0,
          fact: "Mystery works through pattern, clue, and reveal.",
        },
      ],
    },
  },

  park_hidden_old_tree: {
    discovery: {
      kid: [
        {
          q: "DISCOVERY: You found the Old Tree. What makes old trees special?",
          options: [
            "They hold age and history",
            "They are made of metal",
            "They float at sea",
            "They drive buses",
          ],
          answer: 0,
          fact: "Old trees can make places feel ancient and special.",
        },
      ],
      teen: [
        {
          q: "DISCOVERY: Why might an old tree feel important in a park?",
          options: [
            "It gives character and memory",
            "It runs the café",
            "It powers the lights",
            "It sells tickets",
          ],
          answer: 0,
          fact: "Old trees often give a park character and memory.",
        },
      ],
      adult: [
        {
          q: "DISCOVERY: What can an old tree add to a landscape?",
          options: [
            "Depth, age, and continuity",
            "Traffic control",
            "Retail signage",
            "Industrial noise",
          ],
          answer: 0,
          fact: "An old tree adds a sense of depth and continuity.",
        },
      ],
    },
  },

  park_hidden_quiet_bench: {
    discovery: {
      kid: [
        {
          q: "DISCOVERY: Why is a quiet bench useful in a park?",
          options: [
            "It gives a calm place to rest",
            "It launches boats",
            "It repairs trains",
            "It grows apples",
          ],
          answer: 0,
          fact: "Quiet places help explorers rest and notice more.",
        },
      ],
      teen: [
        {
          q: "DISCOVERY: What does a hidden quiet bench add to a map?",
          options: [
            "A pause point",
            "A boss arena",
            "A market route",
            "A repair station",
          ],
          answer: 0,
          fact: "Quiet bench spots create pause points in a route.",
        },
      ],
      adult: [
        {
          q: "DISCOVERY: What is valuable about hidden quiet spots?",
          options: [
            "They create reflection and contrast",
            "They produce power",
            "They direct traffic",
            "They store freight",
          ],
          answer: 0,
          fact: "Quiet hidden spots give reflection and contrast.",
        },
      ],
    },
  },

  park_hidden_secret_garden: {
    discovery: {
      kid: [
        {
          q: "DISCOVERY: What makes a secret garden feel special?",
          options: [
            "It feels hidden and magical",
            "It feels like a motorway",
            "It is noisy machinery",
            "It is a shipyard",
          ],
          answer: 0,
          fact: "Secret gardens feel special because they seem hidden and magical.",
        },
      ],
      teen: [
        {
          q: "DISCOVERY: Why do hidden garden spots work well in games?",
          options: [
            "They feel like secret rewards",
            "They feel like traffic jams",
            "They remove exploration",
            "They act like factories",
          ],
          answer: 0,
          fact: "Hidden gardens feel like secret rewards.",
        },
      ],
      adult: [
        {
          q: "DISCOVERY: What does a hidden garden add to a quest map?",
          options: [
            "Atmosphere and contrast",
            "Freight logistics",
            "Industrial output",
            "Street lighting only",
          ],
          answer: 0,
          fact: "A hidden garden adds atmosphere and contrast.",
        },
      ],
    },
  },

  park_hidden_lake_spot: {
    discovery: {
      kid: [
        {
          q: "DISCOVERY: What makes lake spots fun for explorers?",
          options: [
            "They are calm and scenic",
            "They are loud factories",
            "They are airport gates",
            "They are bus depots",
          ],
          answer: 0,
          fact: "Lake spots often feel calm and scenic.",
        },
      ],
      teen: [
        {
          q: "DISCOVERY: What vibe does a hidden lake spot usually give?",
          options: [
            "Calm and observation",
            "Panic and noise",
            "Cargo loading",
            "City traffic",
          ],
          answer: 0,
          fact: "Hidden lake spots work well as calm observation points.",
        },
      ],
      adult: [
        {
          q: "DISCOVERY: What does water add to a route experience?",
          options: [
            "Pause and atmosphere",
            "Only danger",
            "Only commerce",
            "Only speed",
          ],
          answer: 0,
          fact: "Water often adds pause and atmosphere.",
        },
      ],
    },
  },

  abbey_headless_monk: {
    ghost: {
      kid: [
        {
          q: "GHOST ENCOUNTER: A monk appears in the mist. What should explorers use most?",
          options: [
            "Courage and calm",
            "Shouting only",
            "Running into walls",
            "Throwing mud",
          ],
          answer: 0,
          fact: "Ghost encounters work best with courage and calm.",
        },
      ],
      teen: [
        {
          q: "GHOST ENCOUNTER: What gives ghost stories their power?",
          options: [
            "Atmosphere and imagination",
            "Traffic lights",
            "Shopping receipts",
            "Bus timetables",
          ],
          answer: 0,
          fact: "Ghost stories work through atmosphere and imagination.",
        },
      ],
      adult: [
        {
          q: "GHOST ENCOUNTER: Why do haunted legends stay memorable?",
          options: [
            "They combine place, fear, and imagination",
            "They replace road signs",
            "They fuel factories",
            "They control harbour cranes",
          ],
          answer: 0,
          fact: "Haunted legends stay strong because they fuse place and imagination.",
        },
      ],
    },
  },

  abbey_hidden_stone: {
    discovery: {
      kid: [
        {
          q: "DISCOVERY: A silent stone is hidden here. Why do stones matter in ruins?",
          options: [
            "They carry clues from the past",
            "They are remote controls",
            "They run trains",
            "They sell tickets",
          ],
          answer: 0,
          fact: "Stones in ruins can feel like clues from the past.",
        },
      ],
    },
  },

  abbey_hidden_mirror: {
    discovery: {
      teen: [
        {
          q: "DISCOVERY: Valley Mirror found. What do reflective hidden spots add?",
          options: [
            "Mood and mystery",
            "Cargo loading",
            "Market noise",
            "Traffic policing",
          ],
          answer: 0,
          fact: "Reflective hidden spots add mood and mystery.",
        },
      ],
    },
  },

  abbey_hidden_forge: {
    discovery: {
      adult: [
        {
          q: "DISCOVERY: Iron Forge Ruins found. What does a forge site suggest?",
          options: [
            "Labour and transformation",
            "Beach tourism only",
            "Airport lounges",
            "Religious silence only",
          ],
          answer: 0,
          fact: "Forge ruins suggest labour, heat, and transformation.",
        },
      ],
    },
  },
};

/* =========================================================
   RIDDLE BUILDERS
========================================================= */

const RIDDLE_FUNNY = {
  kid: [
    "A confused potato in a wizard hat",
    "Your dad’s lost TV remote",
    "A chicken wearing sunglasses",
    "A penguin driving a bus",
  ],
  teen: [
    "Your group chat at 2am",
    "A dramatic pigeon with attitude",
    "A seagull running a business",
    "Your mate after one hour of sleep",
  ],
  adult: [
    "That one drawer full of random cables",
    "Your sat-nav after a wrong turn",
    "A neighbour with strong opinions",
    "The weekly shop before payday",
  ],
};

const RIDDLE_CLOSE = {
  kid: ["A shadow", "A map", "A mirror", "A clock"],
  teen: ["An echo", "A sign", "A picture", "A tool"],
  adult: ["A symbol", "A signal", "A reflection", "A marker"],
};

const RIDDLE_VERY_CLOSE = {
  kid: ["A book", "A bottle", "A road", "A bell"],
  teen: ["A keypad", "A notebook", "A footprint", "A tower"],
  adult: ["A memory", "A pattern", "A route", "A record"],
};

function makeMcqFromRiddle(riddle, tier = "kid", salt = 0) {
  if (!riddle?.q || !riddle?.a) {
    return makeFallbackTask("Broken riddle entry.", { mode: "logic" });
  }

  const correct = riddle.a;
  const funny = pickOne(RIDDLE_FUNNY[tier], salt + 11) || "A confused potato";
  const close = pickOne(RIDDLE_CLOSE[tier], salt + 22) || "A shadow";
  const veryClose = pickOne(RIDDLE_VERY_CLOSE[tier], salt + 33) || "A map";

  let options = [correct, veryClose, close, funny];
  options = [...new Set(options)];

  while (options.length < 4) {
    options.push(`Option ${options.length + 1}`);
  }

  const shuffled = shuffleSeeded(options, salt);
  const answer = shuffled.indexOf(correct);

  return {
    q: riddle.q,
    options: shuffled,
    answer,
    fact: riddle.a,
    meta: { type: "riddle", tier },
  };
}

/* =========================================================
   HELPERS
========================================================= */

function getPinById(pinId) {
  if (!pinId || !Array.isArray(PINS)) return null;
  return PINS.find((p) => String(p.id) === String(pinId)) || null;
}

function getPinZone(pin) {
  return pin?.set || pin?.zone || "core";
}

function isAbbeyLikeQuestion(q) {
  const t = `${q?.q || ""} ${q?.fact || ""}`.toLowerCase();
  return (
    t.includes("abbey") ||
    t.includes("monk") ||
    t.includes("monastery") ||
    t.includes("henry viii") ||
    t.includes("red sandstone")
  );
}

function isCoreLikeQuestion(q) {
  const t = `${q?.q || ""} ${q?.fact || ""}`.toLowerCase();
  return (
    t.includes("barrow") ||
    t.includes("dock") ||
    t.includes("walney") ||
    t.includes("town hall") ||
    t.includes("cenotaph") ||
    t.includes("ship") ||
    t.includes("submarine") ||
    t.includes("morecambe") ||
    t.includes("piel")
  );
}

function isParkLikeQuestion(q) {
  const t = `${q?.q || ""} ${q?.fact || ""}`.toLowerCase();
  return (
    t.includes("park") ||
    t.includes("green space") ||
    t.includes("play and relax") ||
    t.includes("public space")
  );
}

function buildZoneQuizPool(zone, tier) {
  const zoneBase = QA_BY_ZONE?.[zone]?.quiz?.[tier] || [];
  const zoneKidFallback = tier !== "kid" ? QA_BY_ZONE?.[zone]?.quiz?.kid || [] : [];

  let merged = [...zoneBase, ...zoneKidFallback];

  if (zone === "core") {
    merged = combinePools(
      merged,
      QUIZ_POOL_KID.filter(isCoreLikeQuestion),
      tier === "kid" ? QUIZ_POOL_KID : QUIZ_POOL_KID.slice(0, 20)
    );
  }

  if (zone === "abbey") {
    merged = combinePools(
      merged,
      QUIZ_POOL_KID.filter(isAbbeyLikeQuestion)
    );
  }

  if (zone === "park") {
    merged = combinePools(
      merged,
      QUIZ_POOL_KID.filter(isParkLikeQuestion)
    );
  }

  return merged;
}

function buildZoneHistoryPool(zone, tier) {
  const zoneBase = QA_BY_ZONE?.[zone]?.history?.[tier] || [];
  const zoneKidFallback =
    tier !== "kid" ? QA_BY_ZONE?.[zone]?.history?.kid || [] : [];

  let merged = [...zoneBase, ...zoneKidFallback];

  if (zone === "core") {
    merged = combinePools(
      merged,
      HISTORY_POOL_KID.filter(isCoreLikeQuestion),
      tier === "kid" ? HISTORY_POOL_KID : HISTORY_POOL_KID.slice(0, 6)
    );
  }

  if (zone === "abbey") {
    merged = combinePools(
      merged,
      HISTORY_POOL_KID.filter(isAbbeyLikeQuestion)
    );
  }

  if (zone === "park") {
    merged = combinePools(
      merged,
      HISTORY_POOL_KID.filter(isParkLikeQuestion)
    );
  }

  return merged;
}

function buildZoneLogicPool(zone, tier) {
  return combinePools(
    QA_BY_ZONE?.[zone]?.logic?.[tier] || [],
    tier !== "kid" ? QA_BY_ZONE?.[zone]?.logic?.kid || [] : [],
    RIDDLE_POOL
  );
}

function buildZonePromptPool(zone, mode, tier) {
  const base = QA_BY_ZONE?.[zone]?.[mode]?.[tier] || [];
  const kidFallback = tier !== "kid" ? QA_BY_ZONE?.[zone]?.[mode]?.kid || [] : [];

  if (mode === "speed") {
    return combinePools(base, kidFallback, SPEED_POOL[tier] || [], SPEED_POOL.kid || []);
  }

  if (mode === "battle") {
    return combinePools(base, kidFallback, BATTLE_POOL[tier] || [], BATTLE_POOL.kid || []);
  }

  if (mode === "family") {
    return combinePools(base, kidFallback, FAMILY_POOL[tier] || [], FAMILY_POOL.kid || []);
  }

  if (mode === "activity") {
    return combinePools(base, kidFallback, ACTIVITY_POOL[tier] || [], ACTIVITY_POOL.kid || []);
  }

  if (mode === "ghost") {
    return combinePools(base, kidFallback);
  }

  if (mode === "boss") {
    return combinePools(
      QA_BY_ZONE?.[zone]?.boss?.[tier] || [],
      tier !== "kid" ? QA_BY_ZONE?.[zone]?.boss?.kid || [] : []
    );
  }

  return combinePools(base, kidFallback);
}

function resolvePool({ pinId, zone, mode, tier, pin }) {
  let pinOverride =
    QA_PIN_OVERRIDES?.[pinId]?.[mode]?.[tier] ||
    QA_PIN_OVERRIDES?.[pinId]?.[mode]?.kid ||
    [];

  if (Array.isArray(pinOverride) && pinOverride.length) {
    return { pool: pinOverride, source: "pin" };
  }

  if (pin?.hidden && mode === "discovery") {
    const hiddenOverride =
      QA_PIN_OVERRIDES?.[pinId]?.discovery?.[tier] ||
      QA_PIN_OVERRIDES?.[pinId]?.discovery?.kid ||
      [];
    if (Array.isArray(hiddenOverride) && hiddenOverride.length) {
      return { pool: hiddenOverride, source: "pin-discovery" };
    }
  }

  if (mode === "quiz") {
    const pool = buildZoneQuizPool(zone, tier);
    if (pool.length) return { pool, source: "zone-merged-quiz" };
  }

  if (mode === "history") {
    const pool = buildZoneHistoryPool(zone, tier);
    if (pool.length) return { pool, source: "zone-merged-history" };
  }

  if (mode === "logic") {
    const pool = buildZoneLogicPool(zone, tier);
    if (pool.length) return { pool, source: "zone-merged-logic" };
  }

  if (
    ["activity", "family", "battle", "speed", "ghost", "boss"].includes(mode)
  ) {
    const pool = buildZonePromptPool(zone, mode, tier);
    if (pool.length) return { pool, source: `zone-merged-${mode}` };
  }

  return { pool: [], source: "none" };
}

/* =========================================================
   MAIN EXPORT
========================================================= */

export function getQA(input = {}) {
  const pinId = input.pinId || null;
  const pin = getPinById(pinId);

  const zone = input.zone || getPinZone(pin);
  const mode = input.mode || "quiz";
  const tier = normaliseTier(input.tier || "kid");

  // Use salt, pin, zone, mode, and tier together to spread results better.
  const rawSalt = Number(input.salt || Date.now());
  const stableSalt =
    rawSalt +
    String(pinId || "none").length * 97 +
    String(zone).length * 37 +
    String(mode).length * 19 +
    String(tier).length * 11;

  const { pool, source } = resolvePool({ pinId, zone, mode, tier, pin });

  if (!pool.length) {
    return makeFallbackTask(`No ${mode} content found for ${zone} (${tier}).`, {
      zone,
      mode,
      tier,
      source,
    });
  }

  const picked = pickOne(pool, stableSalt);

  if (mode === "logic" && picked?.q && picked?.a) {
    const built = makeMcqFromRiddle(picked, tier, stableSalt);
    built.meta = { ...(built.meta || {}), zone, pinId, source, mode, tier };
    return built;
  }

  if (picked?.q && Array.isArray(picked?.options)) {
    const shuffledOptions = shuffleSeeded(picked.options, stableSalt + 123);
    const correctText = picked.options[picked.answer];
    const answer = shuffledOptions.indexOf(correctText);

    return {
      ...picked,
      options: shuffledOptions,
      answer,
      meta: {
        ...(picked.meta || {}),
        zone,
        pinId,
        source,
        mode,
        tier,
      },
    };
  }

  if (typeof picked === "string") {
    return {
      ...makePromptTask(picked, mode),
      meta: {
        zone,
        pinId,
        source,
        mode,
        tier,
        promptOnly: true,
      },
    };
  }

  return makeFallbackTask("Task format not recognised.", {
    zone,
    pinId,
    source,
    mode,
    tier,
  });
}