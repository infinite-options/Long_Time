/** Sayable words dealt so no two assignments in a table share one. */
const RAW_WORDS = [
  "elephant", "giraffe", "penguin", "dolphin", "octopus", "hedgehog", "flamingo", "kangaroo",
  "panda", "otter", "walrus", "jaguar", "peacock", "chameleon", "armadillo", "narwhal",
  "platypus", "toucan", "raccoon", "badger", "moose", "bison", "alpaca", "cobra",
  "parrot", "hamster", "gecko", "lobster", "starfish", "seahorse", "pelican", "buffalo",
  "leopard", "cheetah", "gorilla", "camel", "zebra", "squirrel", "beaver", "iguana",
  "falcon", "heron", "ostrich", "coyote", "meerkat", "llama", "donkey", "rabbit",
  "turtle", "whale", "shark", "crab", "shrimp", "snail", "moth", "beetle",
  "pretzel", "mango", "waffle", "biscuit", "paprika", "cinnamon", "avocado", "dumpling",
  "pancake", "brownie", "caramel", "pistachio", "croissant", "meatball", "lasagna", "oatmeal",
  "blueberry", "marshmallow", "quesadilla", "sriracha", "wasabi", "kimchi", "tortilla", "baguette",
  "cheddar", "espresso", "macaron", "tiramisu", "gingersnap", "jalapeno", "artichoke", "asparagus",
  "broccoli", "coconut", "pineapple", "strawberry", "watermelon", "apricot", "hazelnut", "pomegranate",
  "umbrella", "hammock", "lantern", "compass", "telescope", "typewriter", "harmonica", "tambourine",
  "accordion", "kaleidoscope", "backpack", "suitcase", "binoculars", "trampoline", "skateboard", "unicycle",
  "boomerang", "canoe", "kayak", "anchor", "lighthouse", "windmill", "wheelbarrow", "scarecrow",
  "snowman", "igloo", "chandelier", "hourglass", "flashlight", "corkscrew", "spatula", "colander",
  "balloon", "kazoo", "banjo", "maracas", "trumpet", "violin", "piano", "cymbal",
  "ukulele", "bagpipe", "trombone", "clarinet", "saxophone", "piccolo", "xylophone", "castanet",
  "volcano", "canyon", "glacier", "meadow", "oasis", "lagoon", "harbor", "island",
  "desert", "forest", "prairie", "tundra", "reef", "geyser", "waterfall", "comet",
  "meteor", "rainbow", "thunder", "blizzard", "tornado", "monsoon", "aurora", "eclipse",
  "pebble", "boulder", "crystal", "marble", "granite", "emerald", "sapphire", "amber",
  "quilt", "mitten", "cardigan", "bowtie", "bandana", "sombrero", "galoshes", "overalls",
  "suspenders", "pocketwatch", "monocle", "parasol", "handkerchief", "cufflink", "earmuff", "scarf",
  "bicycle", "scooter", "rowboat", "sailboat", "submarine", "glider", "zeppelin", "wagon",
  "carriage", "sled", "snowshoe", "surfboard", "paddleboard", "rollerblade", "pogo", "stilts",
  "yo-yo", "frisbee", "domino", "checker", "puzzle", "rubik", "pinwheel", "kite",
  "firefly", "ladybug", "dragonfly", "bumblebee", "caterpillar", "butterfly", "cricket", "grasshopper",
  "sunflower", "daisy", "tulip", "orchid", "daffodil", "lavender", "marigold", "hibiscus",
  "cactus", "bamboo", "sequoia", "willow", "maple", "clover", "thistle", "ivy",
  "mustard", "ketchup", "vanilla", "licorice", "peppermint", "gingerbread", "shortcake", "cobbler",
  "pudding", "custard", "gelato", "sorbet", "noodle", "ravioli", "gnocchi", "falafel",
  "hummus", "pretzelstick", "popcorn", "walnut", "almond", "cashew", "pecan", "raisin",
  "teapot", "kettle", "toaster", "blender", "ladle", "whisk", "skillet", "thermos",
  "mailbox", "doorknob", "bookshelf", "hamper", "clothespin", "toothpick", "paperclip", "snowglobe",
];

function uniqueWords(list) {
  const seen = new Set();
  const out = [];
  for (const word of list) {
    const clean = String(word).trim().toLowerCase();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

const WORDS = uniqueWords(RAW_WORDS);

module.exports = { WORDS };
