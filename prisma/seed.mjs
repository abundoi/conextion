import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import path from "path";
import crypto from "crypto";

// Load .env.local first
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:-2%7Bs%23Y%2CC0S2SD4k3@34.10.34.61:5432/conextion?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

const SEED_USERS = [
  {
    slug: "elena",
    email: "elena.v@conextion.dev",
    displayName: "Elena Vance",
    age: 26,
    gender: "woman",
    bio: "Architectural designer by day, indie concert enthusiast by night. Always hunting for the city's crispest pour-over coffee and hidden art galleries.",
    city: "San Francisco",
    country: "United States",
    latitude: 37.7749,
    longitude: -122.4194,
    relationshipIntent: "long_term",
    interests: ["coffee-cafes", "art-museums", "live-music", "architecture", "travel-exploration"],
    prompts: [
      { promptText: "A life goal of mine is...", answer: "Design a zero-emission sanctuary cabin in the Pacific Northwest." },
      { promptText: "The best way to spend a Sunday is...", answer: "Browsing a local farmers market followed by sketching in Dolores Park." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "marcus",
    email: "marcus.chen@conextion.dev",
    displayName: "Marcus Chen",
    age: 29,
    gender: "man",
    bio: "Software founder passionate about decentralized systems and outdoor endurance. Weekend cyclist, amateur sourdough baker, and jazz club regular.",
    city: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.006,
    relationshipIntent: "dating",
    interests: ["technology-coding", "fitness-gym", "hiking-outdoors", "cooking-dining"],
    prompts: [
      { promptText: "Together, we could...", answer: "Tackle a 50-mile coastal bike route and celebrate with wood-fired pizza." },
      { promptText: "I am weirdly passionate about...", answer: "Perfecting sourdough hydration percentages and vintage mechanical keyboards." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "sophia",
    email: "sophia.martinez@conextion.dev",
    displayName: "Sophia Martinez",
    age: 27,
    gender: "woman",
    bio: "Documentary photographer documenting stories across Latin America. Fluent in 3 languages, huge fan of spicy street food and vinyl records.",
    city: "Los Angeles",
    country: "United States",
    latitude: 34.0522,
    longitude: -118.2437,
    relationshipIntent: "dating",
    interests: ["photography", "travel-exploration", "film-cinema", "art-museums"],
    prompts: [
      { promptText: "My simple pleasures include...", answer: "Golden hour in the desert and finding an obscure bossa nova vinyl." },
      { promptText: "The hallmark of a great conversation is...", answer: "Losing track of time until the restaurant staff starts packing up chairs." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "liam",
    email: "liam.patel@conextion.dev",
    displayName: "Liam Patel",
    age: 31,
    gender: "man",
    bio: "Emergency medicine physician with an insatiable love for wilderness backpacking, rock climbing, and learning cello.",
    city: "Seattle",
    country: "United States",
    latitude: 47.6062,
    longitude: -122.3321,
    relationshipIntent: "long_term",
    interests: ["hiking-outdoors", "fitness-gym", "live-music", "reading-literature"],
    prompts: [
      { promptText: "A life goal of mine is...", answer: "Summit Mount Rainier with someone who loves alpine sunrises as much as I do." },
      { promptText: "The best way to spend a Sunday is...", answer: "A trail run in the Cascades followed by hot cider and a good book by the fire." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "chloe",
    email: "chloe.dupont@conextion.dev",
    displayName: "Chloé Dupont",
    age: 25,
    gender: "woman",
    bio: "Fashion buyer & ceramicist. Raised in Paris, now embracing the Pacific fog. Passionate about brutalist design, natural wines, and film festivals.",
    city: "San Francisco",
    country: "United States",
    latitude: 37.7749,
    longitude: -122.4194,
    relationshipIntent: "open_to_options",
    interests: ["art-museums", "wine-tasting", "film-cinema", "coffee-cafes"],
    prompts: [
      { promptText: "My simple pleasures include...", answer: "Warm croissants on crisp mornings and throwing pottery on a quiet studio night." },
      { promptText: "Together, we could...", answer: "Find an under-the-radar natural wine bar and dissect European cinema." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "alex",
    email: "alex.rivera@conextion.dev",
    displayName: "Alex Rivera",
    age: 28,
    gender: "non_binary",
    bio: "UI/UX researcher & botanical illustrator. Always exploring community gardens, queer bookshops, and experimenting with fermentation.",
    city: "Austin",
    country: "United States",
    latitude: 30.2672,
    longitude: -97.7431,
    relationshipIntent: "dating",
    interests: ["art-museums", "reading-literature", "cooking-dining", "dogs-pets"],
    prompts: [
      { promptText: "I am weirdly passionate about...", answer: "Propagating rare monsteras and cataloging native Texas wildflowers." },
      { promptText: "The hallmark of a great conversation is...", answer: "Unfiltered vulnerability coupled with infectious belly laughs." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "julian",
    email: "julian.wright@conextion.dev",
    displayName: "Julian Wright",
    age: 32,
    gender: "man",
    bio: "Acoustics engineer & music producer. Obsessed with high-fidelity sound, mid-century modern furniture, and spontaneous road trips.",
    city: "Chicago",
    country: "United States",
    latitude: 41.8781,
    longitude: -87.6298,
    relationshipIntent: "long_term",
    interests: ["live-music", "technology-coding", "art-museums", "coffee-cafes"],
    prompts: [
      { promptText: "Together, we could...", answer: "Take a cross-country train trip and curate the ultimate soundtrack along the way." },
      { promptText: "A life goal of mine is...", answer: "Build an all-analog recording sanctuary in a converted barn." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "zara",
    email: "zara.al-mansoor@conextion.dev",
    displayName: "Zara Al-Mansoor",
    age: 26,
    gender: "woman",
    bio: "Biotech researcher working on longevity therapies. Tennis player, avid science fiction reader, and golden retriever mom.",
    city: "Boston",
    country: "United States",
    latitude: 42.3601,
    longitude: -71.0589,
    relationshipIntent: "dating",
    interests: ["fitness-gym", "dogs-pets", "reading-literature", "technology-coding"],
    prompts: [
      { promptText: "The best way to spend a Sunday is...", answer: "Playing mixed doubles in the morning, followed by an iced latte and deep sci-fi discussions." },
      { promptText: "My simple pleasures include...", answer: "My dog doing zoomies when I come home from the lab." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "david",
    email: "david.kim@conextion.dev",
    displayName: "David Kim",
    age: 30,
    gender: "man",
    bio: "Product strategist & Michelin-guide explorer. Passionate about minimalist aesthetics, Japanese omakase, and ski trips to Hokkaido.",
    city: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.006,
    relationshipIntent: "dating",
    interests: ["cooking-dining", "travel-exploration", "wine-tasting", "art-museums"],
    prompts: [
      { promptText: "Together, we could...", answer: "Cook an ambitious five-course dinner from scratch with a great bottle of pinot noir." },
      { promptText: "My simple pleasures include...", answer: "Fresh snow on early morning ski slopes before anyone else leaves tracks." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "maya",
    email: "maya.lin@conextion.dev",
    displayName: "Maya Lin",
    age: 24,
    gender: "woman",
    bio: "Environmental journalist & climate podcast host. Always on the move with my notebook, hiking boots, and film camera.",
    city: "Vancouver",
    country: "Canada",
    latitude: 49.2827,
    longitude: -123.1207,
    relationshipIntent: "long_term",
    interests: ["hiking-outdoors", "photography", "travel-exploration", "reading-literature"],
    prompts: [
      { promptText: "A life goal of mine is...", answer: "Publish an investigative photo essay on ancient old-growth forests." },
      { promptText: "The hallmark of a great conversation is...", answer: "When both people share a perspective that genuinely changes how the other sees the world." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "ethan",
    email: "ethan.brooks@conextion.dev",
    displayName: "Ethan Brooks",
    age: 33,
    gender: "man",
    bio: "Aerospace engineer working on lunar rover telemetry. Astrophotographer, amateur astronomer, and serious board game strategist.",
    city: "Denver",
    country: "United States",
    latitude: 39.7392,
    longitude: -104.9903,
    relationshipIntent: "long_term",
    interests: ["technology-coding", "hiking-outdoors", "board-games", "photography"],
    prompts: [
      { promptText: "I am weirdly passionate about...", answer: "Explaining orbital mechanics during camping trips while looking at shooting stars." },
      { promptText: "Together, we could...", answer: "Spend a weekend stargazing in Utah's dark sky parks." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "camila",
    email: "camila.santos@conextion.dev",
    displayName: "Camila Santos",
    age: 28,
    gender: "woman",
    bio: "Samba dance instructor & culinary curator. Big laugh, warm energy, and always organizing communal backyard dinners with friends.",
    city: "Miami",
    country: "United States",
    latitude: 25.7617,
    longitude: -80.1918,
    relationshipIntent: "dating",
    interests: ["cooking-dining", "live-music", "fitness-gym", "travel-exploration"],
    prompts: [
      { promptText: "The best way to spend a Sunday is...", answer: "Cooking feijoada while live bossa nova plays, welcoming anyone who knocks on the door." },
      { promptText: "My simple pleasures include...", answer: "Ocean swims at sunrise before the beach crowds arrive." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "owen",
    email: "owen.davies@conextion.dev",
    displayName: "Owen Davies",
    age: 31,
    gender: "man",
    bio: "Landscape architect specializing in urban rewilding. Loves cold-water swimming, historic pub walks, and vintage Land Rovers.",
    city: "London",
    country: "United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
    relationshipIntent: "long_term",
    interests: ["hiking-outdoors", "dogs-pets", "reading-literature", "coffee-cafes"],
    prompts: [
      { promptText: "Together, we could...", answer: "Take a weekend road trip to the Scottish Highlands with my border collie." },
      { promptText: "The hallmark of a great conversation is...", answer: "Dry wit, comfortable silences, and genuine curiosity about the mundane." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "aaliyah",
    email: "aaliyah.jordan@conextion.dev",
    displayName: "Aaliyah Jordan",
    age: 27,
    gender: "woman",
    bio: "Civil rights attorney & marathon runner. Fueled by espresso, justice, and discovering hidden live jazz venues.",
    city: "Washington DC",
    country: "United States",
    latitude: 38.9072,
    longitude: -77.0369,
    relationshipIntent: "long_term",
    interests: ["fitness-gym", "live-music", "reading-literature", "coffee-cafes"],
    prompts: [
      { promptText: "A life goal of mine is...", answer: "Argue and win a landmark civil liberties case before the Supreme Court." },
      { promptText: "My simple pleasures include...", answer: "The post-marathon celebration meal where calories do not exist." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "kai",
    email: "kai.takahashi@conextion.dev",
    displayName: "Kai Takahashi",
    age: 29,
    gender: "non_binary",
    bio: "Game audio designer and tea master. Exploring the intersection of spatial soundscapes, ambient meditation, and retro consoles.",
    city: "Seattle",
    country: "United States",
    latitude: 47.6062,
    longitude: -122.3321,
    relationshipIntent: "open_to_options",
    interests: ["technology-coding", "yoga-meditation", "board-games", "art-museums"],
    prompts: [
      { promptText: "I am weirdly passionate about...", answer: "Brewing sencha at exact water temperatures for maximum umami." },
      { promptText: "Together, we could...", answer: "Build an interactive audio installation or get lost in an indie arcade." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "lucas",
    email: "lucas.moreau@conextion.dev",
    displayName: "Lucas Moreau",
    age: 34,
    gender: "man",
    bio: "Sommelier and boutique hotelier. Passionate about sustainable viticulture, Mediterranean architecture, and ocean sailing.",
    city: "Montreal",
    country: "Canada",
    latitude: 45.5017,
    longitude: -73.5673,
    relationshipIntent: "long_term",
    interests: ["wine-tasting", "cooking-dining", "travel-exploration", "art-museums"],
    prompts: [
      { promptText: "Together, we could...", answer: "Charter a small sailboat around Greek islands and dock at local seaside tavernas." },
      { promptText: "The best way to spend a Sunday is...", answer: "A slow breakfast followed by scouring antique markets for forgotten treasures." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "hannah",
    email: "hannah.schmidt@conextion.dev",
    displayName: "Hannah Schmidt",
    age: 26,
    gender: "woman",
    bio: "Industrial designer & bouldering enthusiast. Minimalist, lover of typography, techno clubs, and plant-based culinary experiments.",
    city: "Berlin",
    country: "Germany",
    latitude: 52.52,
    longitude: 13.405,
    relationshipIntent: "dating",
    interests: ["art-museums", "fitness-gym", "live-music", "coffee-cafes"],
    prompts: [
      { promptText: "My simple pleasures include...", answer: "Solving a tricky boulder problem and drinking a sparkling mate in the sun." },
      { promptText: "The hallmark of a great conversation is...", answer: "Playful banter that challenges my preconceptions without any ego." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "noah",
    email: "noah.tanaka@conextion.dev",
    displayName: "Noah Tanaka",
    age: 27,
    gender: "man",
    bio: "Robotics engineer building autonomous conservation drones. Surfer, ramen purist, and collector of vintage Japanese watches.",
    city: "San Diego",
    country: "United States",
    latitude: 32.7157,
    longitude: -117.1611,
    relationshipIntent: "dating",
    interests: ["technology-coding", "fitness-gym", "cooking-dining", "photography"],
    prompts: [
      { promptText: "A life goal of mine is...", answer: "Deploy drone arrays to restore coral reefs across the South Pacific." },
      { promptText: "Together, we could...", answer: "Catch sunset waves in Encinitas and grab fish tacos by the fire pits." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "leila",
    email: "leila.kassov@conextion.dev",
    displayName: "Leila Kassov",
    age: 29,
    gender: "woman",
    bio: "Classical violinist & yoga instructor. Finding balance between high-intensity performance seasons and slow, mindful living.",
    city: "Toronto",
    country: "Canada",
    latitude: 43.6532,
    longitude: -79.3832,
    relationshipIntent: "long_term",
    interests: ["yoga-meditation", "live-music", "reading-literature", "hiking-outdoors"],
    prompts: [
      { promptText: "My simple pleasures include...", answer: "Waking up before sunrise to practice Bach while the world is completely silent." },
      { promptText: "The best way to spend a Sunday is...", answer: "Vinyasa yoga, cooking a hearty vegetable stew, and sharing stories over herbal tea." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
  {
    slug: "gabriel",
    email: "gabriel.silva@conextion.dev",
    displayName: "Gabriel Silva",
    age: 35,
    gender: "man",
    bio: "Venture partner focused on clean energy & sustainable agriculture. Surfer, author, and father to an adopted rescue husky.",
    city: "San Francisco",
    country: "United States",
    latitude: 37.7749,
    longitude: -122.4194,
    relationshipIntent: "long_term",
    interests: ["dogs-pets", "hiking-outdoors", "wine-tasting", "technology-coding"],
    prompts: [
      { promptText: "A life goal of mine is...", answer: "Fund the next generation of carbon removal breakthroughs and leave the planet better than we found it." },
      { promptText: "The hallmark of a great conversation is...", answer: "Kindness, depth, and laughter that feels like coming home." },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80", isPrimary: true },
      { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80", isPrimary: false },
    ],
  },
];

async function main() {
  console.log("🌱 Starting Conextion 20 User Seed Pipeline...");

  // 1. Fetch available interests from DB
  const dbInterests = await prisma.interest.findMany();
  const interestMap = new Map(dbInterests.map((i) => [i.slug, i.id]));

  console.log(`Found ${dbInterests.length} existing interest taxonomies in database.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < SEED_USERS.length; i++) {
    const seed = SEED_USERS[i];
    const firebaseUid = `seed_firebase_uid_${seed.slug}`;
    const now = new Date();
    const birthdate = new Date(now.getFullYear() - seed.age, 5, 15);

    // 1. Upsert User
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        firebaseUid,
        role: "member",
        accountStatus: "active",
        emailVerifiedAt: now,
      },
      create: {
        firebaseUid,
        email: seed.email,
        role: "member",
        accountStatus: "active",
        emailVerifiedAt: now,
      },
    });

    // 2. Upsert UserProfile
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: seed.displayName,
        birthdate,
        computedAge: seed.age,
        gender: seed.gender,
        bio: seed.bio,
        locationCity: seed.city,
        locationCountry: seed.country,
        latitude: seed.latitude,
        longitude: seed.longitude,
        relationshipIntent: seed.relationshipIntent,
        isProfileComplete: true,
        isVisible: true,
      },
      create: {
        userId: user.id,
        displayName: seed.displayName,
        birthdate,
        computedAge: seed.age,
        gender: seed.gender,
        bio: seed.bio,
        locationCity: seed.city,
        locationCountry: seed.country,
        latitude: seed.latitude,
        longitude: seed.longitude,
        relationshipIntent: seed.relationshipIntent,
        isProfileComplete: true,
        isVisible: true,
      },
    });

    // 3. Upsert UserPreferences
    await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {
        minAgePreference: 18,
        maxAgePreference: 45,
        maxDistanceKm: 150,
        interestedInGenders: ["man", "woman", "non_binary"],
        relationshipIntentFilter: ["dating", "long_term", "casual", "open_to_options"],
      },
      create: {
        userId: user.id,
        minAgePreference: 18,
        maxAgePreference: 45,
        maxDistanceKm: 150,
        interestedInGenders: ["man", "woman", "non_binary"],
        relationshipIntentFilter: ["dating", "long_term", "casual", "open_to_options"],
      },
    });

    // 4. Upsert Photos
    await prisma.profilePhoto.deleteMany({ where: { userId: user.id } });
    for (let pIdx = 0; pIdx < seed.photos.length; pIdx++) {
      const p = seed.photos[pIdx];
      await prisma.profilePhoto.create({
        data: {
          userId: user.id,
          storagePath: `seeds/${seed.slug}/photo_${pIdx}.jpg`,
          publicUrl: p.url,
          isPrimary: p.isPrimary,
          displayOrder: pIdx,
          moderationStatus: "approved",
        },
      });
    }

    // 5. Connect Interests
    await prisma.userInterest.deleteMany({ where: { userId: user.id } });
    for (const slug of seed.interests) {
      const interestId = interestMap.get(slug);
      if (interestId) {
        await prisma.userInterest.create({
          data: {
            userId: user.id,
            interestId,
          },
        });
      }
    }

    // 6. Upsert Prompts
    await prisma.userPrompt.deleteMany({ where: { userId: user.id } });
    for (let prIdx = 0; prIdx < seed.prompts.length; prIdx++) {
      const pr = seed.prompts[prIdx];
      await prisma.userPrompt.create({
        data: {
          userId: user.id,
          promptText: pr.promptText,
          answer: pr.answer,
          order: prIdx,
        },
      });
    }

    // 7. Consent Records
    await prisma.consentRecord.deleteMany({ where: { userId: user.id } });
    await prisma.consentRecord.create({
      data: {
        userId: user.id,
        consentType: "age_certification_18plus",
        consentVersion: "1.0",
        granted: true,
        ipAddress: "127.0.0.1",
        userAgent: "Conextion Seed Script",
        agreementHash: crypto.createHash("sha256").update(`${user.id}:18plus`).digest("hex"),
      },
    });

    createdCount++;
    console.log(`[${i + 1}/20] Seeded: ${seed.displayName} (${seed.gender}, ${seed.age}) in ${seed.city}`);
  }

  const totalUsers = await prisma.user.count();
  const totalProfiles = await prisma.userProfile.count({ where: { isProfileComplete: true } });
  const totalPhotos = await prisma.profilePhoto.count({ where: { moderationStatus: "approved" } });

  console.log(`\n🎉 Seeding Complete!`);
  console.log(`Total Users in DB: ${totalUsers}`);
  console.log(`Complete Profiles: ${totalProfiles}`);
  console.log(`Approved Photos:   ${totalPhotos}`);
}

main()
  .catch((err) => {
    console.error("❌ Seed Pipeline Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
