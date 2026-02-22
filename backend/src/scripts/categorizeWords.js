/**
 * Categorize Words Script
 *
 * Tags every word in the PostgreSQL `words` table with a meaningful category
 * based on keyword matching against the English side.
 *
 * Usage:
 *   node src/scripts/categorizeWords.js            # live run
 *   node src/scripts/categorizeWords.js --dry-run   # preview without writing
 */

require('dotenv').config();
const { pool } = require('../config/database');

const DRY_RUN = process.argv.includes('--dry-run');

const CATEGORY_KEYWORDS = {
  cooking: ['cook','bake','fry','roast','grill','boil','stew','oven','pan','pot','skillet','spatula','whisk','ladle','saucepan','kitchen','microwave','blender','knead','simmer','recipe','ingredient','dough','broth','seasoning'],
  restaurants: ['restaurant','waiter','waitress','menu','reservation','appetizer','dessert','main course','buffet','cafeteria','diner','bistro','cafe','chef','dining'],
  food_drink: ['food','eat','drink','bread','meat','beef','pork','lamb','chicken','turkey','fish','shrimp','fruit','apple','banana','orange','grape','strawberry','cherry','peach','pear','lemon','melon','mango','berry','vegetable','potato','tomato','carrot','onion','garlic','pepper','lettuce','cabbage','broccoli','spinach','cucumber','bean','pea','corn','mushroom','rice','pasta','noodle','cereal','wheat','flour','milk','cheese','butter','cream','yogurt','egg','sugar','salt','honey','jam','sauce','vinegar','oil','spice','soup','salad','sandwich','pizza','burger','cake','pie','cookie','chocolate','candy','ice cream','snack','breakfast','lunch','dinner','supper','meal','coffee','tea','juice','beer','wine','soda','cocktail','beverage','thirsty','hungry','appetite','taste','delicious','sour','bitter','sweet','salty','spicy','flavor','nut','almond','walnut','peanut','coconut'],
  family: ['mother','father','mom','dad','mum','parent','daughter','son','sister','brother','sibling','grandmother','grandfather','grandma','grandpa','aunt','uncle','cousin','nephew','niece','husband','wife','spouse','family','twin','baby','infant','toddler','child','kid','teenager','ancestor','relative'],
  romance: ['love','kiss','hug','romance','romantic','boyfriend','girlfriend','partner','couple','wedding','marry','marriage','engagement','honeymoon','valentine','affection','sweetheart','darling','divorce','bride','groom'],
  friendship: ['friend','friendship','buddy','pal','companion','mate','neighbor','neighbour','acquaintance'],
  people: ['person','people','man','woman','boy','girl','gentleman','lady','adult','elder','youth','stranger','crowd','individual','human','citizen'],
  greetings: ['hello','goodbye','good morning','good evening','good night','welcome','farewell','bye','greeting'],
  politeness: ['please','thank','thanks','sorry','excuse me','pardon','apologize','apology','forgive','polite','courtesy','manners','respect','congratulations'],
  conversation: ['speak','talk','say','tell','ask','answer','reply','discuss','chat','conversation','dialogue','communicate','mention','explain','describe','argue','debate','negotiate','opinion','suggest','advise','whisper','shout','language','voice','speech'],
  common_phrases: ['maybe','perhaps','of course','anyway','however','therefore','although','meanwhile','nevertheless','actually','especially','definitely','probably','certainly','exactly','absolutely'],
  emotions: ['happy','sad','angry','fear','afraid','scared','anxious','worry','nervous','excited','bored','lonely','jealous','proud','ashamed','embarrassed','surprised','confused','frustrated','disappointed','joy','sorrow','grief','anger','rage','panic','terror','disgust','envy','guilt','shame','emotion','feeling','mood','cry','weep','laugh','smile','frown','hate','dislike'],
  health: ['doctor','nurse','hospital','clinic','medicine','pill','pharmacy','prescription','symptom','disease','illness','sick','fever','cough','cold','flu','infection','pain','ache','headache','surgery','wound','injury','bandage','ambulance','emergency','treatment','therapy','cure','heal','vaccine','injection','blood','heart','lung','brain','bone','muscle','nerve','skin','organ','head','face','eye','ear','nose','mouth','lip','tongue','tooth','teeth','neck','throat','shoulder','arm','elbow','wrist','hand','finger','thumb','chest','stomach','belly','leg','knee','ankle','foot','toe','body','hair','pregnant','pregnancy','birth','allergy','cancer','virus','patient','diagnosis','healthy','health'],
  travel_tourism: ['travel','trip','journey','vacation','holiday','tourism','tourist','passport','visa','luggage','suitcase','ticket','boarding pass','customs','abroad','souvenir','destination','excursion'],
  hotels: ['hotel','motel','hostel','inn','lodge','resort','accommodation','suite','lobby','reception','check-in','check-out','booking','guest','concierge','housekeeping'],
  transport: ['car','bus','train','plane','airplane','flight','airport','station','subway','metro','tram','taxi','bicycle','bike','motorcycle','truck','van','ship','boat','ferry','yacht','sail','port','vehicle','drive','ride','engine','wheel','tire','brake','fuel','gas','highway','road','street','traffic','parking','passenger','pilot','driver'],
  directions: ['north','south','east','west','left','right','straight','turn','corner','cross','crossing','intersection','map','compass','direction','navigate','opposite','beside','between','behind','ahead','near','far','forward','backward','upstairs','downstairs'],
  sightseeing: ['museum','monument','statue','castle','palace','cathedral','temple','tower','ruins','attraction','landmark','exhibit','exhibition','gallery','tour','guide','sightseeing','fountain','bridge'],
  places: ['city','town','village','capital','suburb','downtown','neighborhood','district','square','park','garden','market','mall','store','shop','bakery','butcher','bank','post office','library','church','theater','theatre','cinema','stadium','gym','pool','zoo','farm','factory','building'],
  geography: ['country','continent','island','ocean','sea','river','lake','mountain','hill','valley','desert','forest','jungle','cliff','cave','volcano','glacier','waterfall','coast','beach','shore','bay','gulf','canal','swamp','earth','world','globe'],
  work_business: ['work','job','career','profession','occupation','office','desk','boss','manager','director','employee','colleague','coworker','staff','team','meeting','conference','salary','wage','income','bonus','promotion','hire','fire','resign','retire','interview','resume','contract','deadline','project','task','report','company','business','corporation','enterprise','industry','customer','client','profit','revenue','budget'],
  education: ['school','university','college','academy','class','classroom','lesson','lecture','course','seminar','teacher','professor','student','pupil','exam','test','quiz','homework','assignment','essay','grade','diploma','degree','certificate','scholarship','study','learn','teach','educate','education','textbook','notebook','pencil','pen','eraser','ruler','blackboard','graduate','graduation','curriculum','semester','kindergarten'],
  reading: ['book','novel','poem','poetry','story','tale','author','writer','poet','chapter','page','paragraph','read','write','publish','publisher','editor','library','bookstore','magazine','newspaper','article','journal','diary','biography','fiction','literature','text','manuscript','letter','envelope','postcard','stamp','document','print','headline','title'],
  housing: ['house','home','apartment','flat','condo','cottage','cabin','mansion','villa','hut','tent','shelter','dwelling','residence','room','bedroom','bathroom','kitchen','living room','dining room','basement','attic','garage','balcony','terrace','patio','porch','hallway','stairs','elevator','roof','ceiling','floor','wall','window','door','gate','fence','chimney','yard','lawn','rent','mortgage','landlord','tenant','lease'],
  home_family: ['furniture','table','chair','sofa','couch','armchair','shelf','bookcase','cabinet','drawer','wardrobe','closet','bed','mattress','pillow','blanket','curtain','carpet','rug','lamp','mirror','clock','vase','dish','plate','bowl','cup','mug','glass','spoon','fork','knife','napkin','stove','refrigerator','fridge','dishwasher','iron','vacuum','broom','mop','bucket','soap','detergent','sponge','towel','key','lock','doorbell'],
  tools: ['tool','hammer','screwdriver','wrench','pliers','saw','drill','nail','screw','bolt','wire','rope','tape','glue','paint','brush','ladder','shovel','rake','axe','chisel','clamp','toolbox','repair','fix','build','construct'],
  clothing: ['shirt','blouse','sweater','jacket','coat','vest','pants','trousers','jeans','shorts','skirt','dress','suit','tie','belt','sock','shoe','boot','sandal','slipper','sneaker','hat','cap','scarf','glove','mitten','underwear','pajamas','robe','apron','uniform','swimsuit','umbrella','pocket','button','zipper','sleeve','collar','fabric','cotton','silk','wool','leather','clothing','clothes','outfit','costume','fashion','style','jewelry','necklace','bracelet','ring','earring','watch','glasses','sunglasses','purse','wallet','handbag','bag'],
  shopping: ['buy','sell','purchase','shop','shopping','store','market','mall','supermarket','grocery','price','cost','cheap','expensive','discount','sale','bargain','receipt','cashier','checkout','cart','basket','brand','product','item','size','exchange','return','refund','warranty','consumer','merchant','vendor'],
  money_finance: ['money','cash','coin','dollar','euro','pound','currency','bank','account','savings','loan','debt','credit','debit','interest','tax','insurance','invest','investment','stock','share','bond','fund','profit','loss','income','expense','budget','finance','financial','economy','economic','wealth','poverty','rich','poor','pay','payment','fee','charge','withdraw','deposit','transfer','bill','invoice','bankrupt','inflation','recession'],
  animals: ['dog','cat','bird','fish','horse','cow','pig','sheep','goat','duck','goose','rabbit','mouse','rat','hamster','squirrel','deer','bear','wolf','fox','lion','tiger','elephant','monkey','ape','giraffe','zebra','crocodile','snake','lizard','turtle','frog','whale','dolphin','shark','octopus','seal','penguin','eagle','hawk','owl','parrot','pigeon','swan','crow','butterfly','bee','ant','spider','mosquito','beetle','worm','snail','pet','animal','puppy','kitten','paw','claw','tail','wing','feather','fur','beak','horn','nest','cage','zoo','vet'],
  plants: ['plant','flower','tree','bush','shrub','grass','weed','leaf','branch','trunk','root','seed','bud','bloom','blossom','petal','stem','thorn','vine','rose','tulip','daisy','sunflower','lily','orchid','oak','pine','maple','palm','willow','birch','garden','greenhouse','soil','fertilizer','grow','harvest','crop','farm','field','forest','woods'],
  nature: ['nature','environment','ecology','ecosystem','habitat','landscape','scenery','wilderness','countryside','sky','sun','moon','star','cloud','rainbow','sunrise','sunset','dawn','dusk','air','wind','breeze','storm','thunder','lightning','fire','flame','smoke','ash','stone','rock','sand','mud','dirt','dust','mineral','crystal','gem','diamond','gold','silver','iron','copper','steel','metal','pollution','recycle','climate'],
  water_ocean: ['ocean','wave','tide','current','surf','swim','dive','snorkel','float','drown','coral','reef','seaweed','shell','pearl','jellyfish','starfish','seahorse','anchor','lighthouse','pond','puddle','splash','drop','flow','pour','flood','dam','waterfall'],
  weather: ['weather','temperature','degree','thermometer','forecast','hot','warm','cool','cold','freezing','humid','rain','snow','hail','sleet','frost','ice','fog','mist','drizzle','blizzard','hurricane','tornado','sunny','cloudy','windy','rainy','snowy','stormy','overcast','season','spring','summer','autumn','fall','winter'],
  time: ['time','clock','hour','minute','second','morning','afternoon','evening','night','midnight','noon','today','tomorrow','yesterday','day','week','month','year','decade','century','monday','tuesday','wednesday','thursday','friday','saturday','sunday','weekend','january','february','march','april','june','july','august','september','october','november','december','calendar','date','schedule','appointment','early','late','soon','ago','before','after','during','always','never','sometimes','often','rarely','frequently','daily','weekly','monthly','yearly','past','present','future','forever'],
  events: ['party','celebration','festival','ceremony','birthday','anniversary','wedding','funeral','christmas','easter','halloween','thanksgiving','new year','carnival','parade','firework','gift','present','surprise','invite','invitation','decorate','decoration','balloon','candle','toast','cheer','celebrate'],
  hobbies: ['hobby','game','play','puzzle','board game','card game','video game','gaming','collect','collection','photography','photo','camera','painting','drawing','craft','sewing','knitting','gardening','fishing','hunting','camping','hiking','climbing','cycling','swimming','dancing','singing','cooking'],
  sports: ['sport','soccer','football','basketball','baseball','tennis','golf','volleyball','hockey','boxing','wrestling','martial art','karate','judo','running','jogging','marathon','sprint','jump','throw','catch','kick','score','goal','point','match','race','champion','medal','trophy','athlete','coach','referee','stadium','field','court','track','exercise','workout','fitness','gym','yoga','stretch','muscle'],
  arts_culture: ['art','artist','painting','sculpture','drawing','sketch','canvas','gallery','exhibit','theater','theatre','drama','play','actor','actress','performance','stage','audience','opera','ballet','dance','culture','cultural','tradition','custom','heritage','museum','classic','modern','contemporary'],
  music: ['music','song','sing','melody','rhythm','beat','note','chord','tune','band','orchestra','concert','album','instrument','guitar','piano','violin','drum','flute','trumpet','saxophone','cello','harmonica','microphone','speaker','volume','loud','quiet','harmony','composer','musician','lyric'],
  science: ['science','scientist','research','experiment','laboratory','lab','theory','hypothesis','data','analysis','discover','discovery','atom','molecule','cell','gene','DNA','protein','energy','force','gravity','radiation','chemical','element','compound','reaction','formula','equation','microscope','telescope'],
  technology: ['computer','laptop','tablet','phone','smartphone','screen','monitor','keyboard','mouse','printer','software','hardware','program','application','app','internet','website','email','download','upload','file','folder','data','database','server','network','wifi','bluetooth','digital','electronic','device','gadget','robot','artificial intelligence','algorithm','code','coding','programming'],
  digital: ['social media','facebook','twitter','instagram','youtube','tiktok','blog','post','share','like','follow','comment','subscribe','online','offline','virtual','streaming','podcast','hashtag','viral','meme','selfie','profile','username','password','login','logout','notification','message','chat'],
  thinking: ['think','thought','idea','concept','theory','logic','reason','understand','knowledge','wisdom','intelligence','memory','remember','forget','imagine','imagination','create','creative','creativity','inspire','inspiration','believe','belief','doubt','question','wonder','curious','curiosity','solve','solution','problem','analyze','decide','decision','choose','choice','plan','strategy'],
  numbers_math: ['number','zero','one','two','three','four','five','six','seven','eight','nine','ten','hundred','thousand','million','billion','count','calculate','calculation','add','subtract','multiply','divide','sum','total','average','percent','percentage','fraction','decimal','equation','formula','geometry','algebra','statistics','graph','chart','measure','measurement','quantity','amount','double','triple','half','quarter'],
  law_politics: ['law','legal','illegal','crime','criminal','court','judge','jury','lawyer','attorney','police','arrest','prison','jail','sentence','trial','evidence','witness','guilty','innocent','fine','penalty','rule','regulation','government','president','minister','parliament','congress','senate','election','vote','campaign','policy','politics','political','democrat','republican','liberal','conservative','constitution','rights','freedom','justice'],
  colors: ['color','colour','red','blue','green','yellow','orange','purple','violet','pink','brown','black','white','gray','grey','gold','silver','beige','turquoise','maroon','navy','teal','ivory','crimson','scarlet','indigo','magenta','cyan','dark','light','bright','pale','vivid','colorful'],
  shapes: ['shape','circle','square','triangle','rectangle','oval','diamond','sphere','cube','cylinder','cone','pyramid','line','angle','curve','edge','surface','area','volume','width','height','length','depth','size','big','small','large','tiny','huge','enormous','giant','narrow','wide','thick','thin','flat','round','sharp','point'],
  verbs: ['run','walk','jump','sit','stand','lie','open','close','start','stop','begin','end','finish','move','push','pull','carry','lift','drop','pick','put','take','give','send','bring','hold','touch','hit','cut','break','throw','catch','fall','climb','enter','leave','arrive','depart','return','follow','lead','wait','hurry','rush'],
  adjectives: ['good','bad','new','old','young','big','small','long','short','tall','high','low','fast','slow','hard','soft','heavy','light','hot','cold','warm','cool','dry','wet','clean','dirty','easy','difficult','simple','complex','beautiful','ugly','pretty','handsome','strong','weak','loud','quiet','dark','bright','deep','shallow','wide','narrow','thick','thin','full','empty','safe','dangerous','important','interesting','boring'],
  objects: ['box','bag','bottle','can','jar','basket','container','package','parcel','envelope','paper','card','sign','label','tag','string','thread','needle','pin','rubber','plastic','wood','stone','brick','concrete','tile','pipe','tube','handle','switch','plug','socket','battery','cable','chain','hook','hanger','rack','tray','bin','trash','garbage','recycle'],
  basic: ['yes','no','not','and','or','but','the','a','an','this','that','these','those','I','you','he','she','it','we','they','my','your','his','her','its','our','their','who','what','where','when','why','how','which','all','some','any','every','each','many','much','few','more','most','less','very','really','just','only','here','there','now','then','up','down','in','out','on','off','over','under','above','below','about','with','without','for','from','to','at','by','of']
};

// Order categories from most specific to most general
const CATEGORY_ORDER = [
  'cooking','restaurants','food_drink',
  'family','romance','friendship','people',
  'greetings','politeness',
  'emotions',
  'health',
  'hotels','sightseeing','travel_tourism','transport','directions',
  'animals','plants','water_ocean','nature','weather',
  'geography','places',
  'education','reading','work_business',
  'music','arts_culture','sports','hobbies',
  'clothing','shopping','money_finance',
  'housing','home_family','tools',
  'science','technology','digital',
  'law_politics',
  'numbers_math','colors','shapes',
  'time','events',
  'thinking','conversation',
  'common_phrases','politeness',
  'verbs','adjectives','objects',
  'basic',
];

/**
 * Given an English text, return the best matching category ID.
 */
function categorize(englishText) {
  if (!englishText) return 'general';
  const lower = englishText.toLowerCase();
  // Extract individual words and also keep full text for phrase matching
  const words = lower.replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(Boolean);

  for (const catId of CATEGORY_ORDER) {
    const keywords = CATEGORY_KEYWORDS[catId];
    if (!keywords) continue;
    for (const kw of keywords) {
      // Multi-word keyword: substring match
      if (kw.includes(' ')) {
        if (lower.includes(kw)) return catId;
      } else {
        // Single word: check if any extracted word starts with or equals keyword
        // Use word-boundary matching to avoid false positives
        if (words.some(w => w === kw || w === kw + 's' || w === kw + 'es' || w === kw + 'ed' || w === kw + 'ing')) {
          return catId;
        }
      }
    }
  }
  return 'general';
}

async function main() {
  const client = await pool.connect();

  try {
    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Categorizing words...\n`);

    // Fetch all words with their English text
    const result = await client.query(
      `SELECT id, word, translation, source_lang, target_lang, category FROM words`
    );

    const rows = result.rows;
    console.log(`Total words in database: ${rows.length.toLocaleString()}`);

    const stats = {};
    const updates = []; // { id, newCategory }

    for (const row of rows) {
      // Determine which column has the English text
      const englishText = row.target_lang === 'en' ? row.word : row.translation;
      const newCategory = categorize(englishText);

      stats[newCategory] = (stats[newCategory] || 0) + 1;

      if (row.category !== newCategory) {
        updates.push({ id: row.id, category: newCategory });
      }
    }

    console.log(`\nCategory distribution:`);
    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    for (const [cat, count] of sorted) {
      console.log(`  ${cat.padEnd(20)} ${count.toLocaleString()}`);
    }

    console.log(`\nWords to update: ${updates.length.toLocaleString()}`);

    if (DRY_RUN) {
      console.log('\n[DRY RUN] No changes written. Remove --dry-run to apply.');
    } else {
      // Batch update in groups of 500
      const BATCH = 500;
      let updated = 0;

      for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH);
        await client.query('BEGIN');

        for (const u of batch) {
          await client.query(
            'UPDATE words SET category = $1 WHERE id = $2',
            [u.category, u.id]
          );
        }

        await client.query('COMMIT');
        updated += batch.length;

        if (updated % 5000 === 0 || updated === updates.length) {
          console.log(`  Updated ${updated.toLocaleString()} / ${updates.length.toLocaleString()}`);
        }
      }

      console.log(`\nDone. ${updated.toLocaleString()} words re-categorized.`);
    }
  } catch (error) {
    console.error('Categorization failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
