/**
 * Static curriculum for the "Social & Fun" track: conversation moves to learn,
 * and role-play scenarios to practice them in. Ordered from easiest/safest
 * (reacting) to hardest (humor, storytelling) for a shy speaker.
 */

export interface MoveLesson {
  id: string;
  title: string;
  tagline: string;
  why: string;
  phrases: { phrase: string; use: string }[];
  example: { speaker: string; text: string }[];
  tryIt: string;
  scenarioId: string;
}

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  brief: string;
  skillFocus: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'coworkers-lunch',
    title: 'Lunch with coworkers',
    emoji: '🥗',
    brief: 'Lunch break with two friendly coworkers who are debating weekend plans and a show everyone is watching.',
    skillFocus: 'Reacting with energy and asking follow-up questions',
  },
  {
    id: 'house-party',
    title: 'Friend-of-a-friend party',
    emoji: '🎉',
    brief: "A house party where the learner only knows the host. Two guests are already mid-conversation in the kitchen about a disastrous trip one of them took.",
    skillFocus: 'Joining a conversation that has already started',
  },
  {
    id: 'group-chat',
    title: 'Group chat plans',
    emoji: '💬',
    brief: 'A friends group chat trying (and failing) to agree on where to eat on Friday. Messages are short and texty.',
    skillFocus: 'Contributing opinions and playful teasing',
  },
  {
    id: 'gym-small-talk',
    title: 'Small talk at the gym',
    emoji: '🏋️',
    brief: 'A regular at the gym starts chatting between sets; a staff member joins in.',
    skillFocus: 'Keeping small talk going instead of letting it die',
  },
  {
    id: 'dinner-stories',
    title: 'Dinner story time',
    emoji: '🍝',
    brief: "Dinner with friends trading 'most embarrassing moment' stories. Someone asks the learner for theirs.",
    skillFocus: 'Telling a short, funny story about yourself',
  },
  {
    id: 'meetup',
    title: 'Meetup / networking event',
    emoji: '☕',
    brief: 'A casual tech meetup with free pizza. Two attendees are chatting about their jobs and joking about the pizza.',
    skillFocus: 'Introducing yourself casually and finding common ground',
  },
];

export const MOVES: MoveLesson[] = [
  {
    id: 'react',
    title: 'React like you mean it',
    tagline: 'The easiest way to participate without "having something to say"',
    why: "Americans expect audible reactions. Staying silent while someone tells a story can read as boredom, even if you're listening closely. A quick reaction keeps you in the conversation for free.",
    phrases: [
      { phrase: 'No way!', use: 'Surprise (positive or negative)' },
      { phrase: "That's wild.", use: 'Something surprising or crazy' },
      { phrase: 'Oh, that sucks.', use: 'Sympathy, casual' },
      { phrase: 'Wait, seriously?', use: 'Disbelief, invites them to keep going' },
      { phrase: "Good for you!", use: 'Someone shares good news' },
      { phrase: 'I love that.', use: 'You like an idea or detail' },
      { phrase: "Ugh, I hate when that happens.", use: 'Relating to an annoying situation' },
    ],
    example: [
      { speaker: 'Jess', text: 'So my flight got canceled, and the next one was the next day.' },
      { speaker: 'You', text: 'Wait, seriously? What did you do?' },
      { speaker: 'Jess', text: 'Slept in the airport, honestly.' },
      { speaker: 'You', text: "No way. That's rough." },
    ],
    tryIt: 'In your next conversation, react out loud at least 3 times before you say anything "smart".',
    scenarioId: 'coworkers-lunch',
  },
  {
    id: 'follow-up',
    title: 'Ask the follow-up',
    tagline: 'People love talking about themselves. Let them.',
    why: "A good follow-up question is the most social thing you can say. It shows interest, takes the pressure off you, and gives you more to react to. Avoid 'interview mode' though: mix in a reaction or something about you.",
    phrases: [
      { phrase: 'How did that go?', use: 'After they mention a plan or event' },
      { phrase: 'Wait, how did you get into that?', use: 'Hobbies, jobs' },
      { phrase: 'What was the best part?', use: 'Trips, events' },
      { phrase: 'Would you do it again?', use: 'Any experience' },
      { phrase: 'So what happened?', use: 'They pause in a story' },
      { phrase: 'Is it worth it?', use: 'Shows, restaurants, purchases' },
    ],
    example: [
      { speaker: 'Mike', text: 'I started rock climbing a few months ago.' },
      { speaker: 'You', text: 'Oh nice! How did you get into that?' },
      { speaker: 'Mike', text: 'A buddy dragged me to the gym and I got hooked.' },
      { speaker: 'You', text: "That's awesome. Is it as scary as it looks?" },
    ],
    tryIt: 'Ask two follow-up questions in a row about the same thing before changing the topic.',
    scenarioId: 'gym-small-talk',
  },
  {
    id: 'jump-in',
    title: 'Jump into a conversation',
    tagline: "You don't need permission. You need a bridge.",
    why: "In group conversations nobody hands you the mic. You join by connecting to what was just said. A 'bridge' phrase lets you enter smoothly, and it's fine to slightly overlap the end of someone's sentence; Americans do it all the time.",
    phrases: [
      { phrase: 'Oh, that reminds me…', use: 'Connect a related story' },
      { phrase: 'Wait, are you talking about…?', use: 'Join by asking what the topic is' },
      { phrase: 'Okay, I have to ask…', use: 'Enter with a question' },
      { phrase: 'Same thing happened to me!', use: 'Relate instantly' },
      { phrase: 'Sorry, I overheard. Is that the new…?', use: 'Joining strangers at a party' },
      { phrase: 'Can I just say…', use: 'Add an opinion with energy' },
    ],
    example: [
      { speaker: 'Sam', text: '…and then the GPS took us down a dirt road for like an hour.' },
      { speaker: 'You', text: "Oh, that reminds me, my GPS once told me to drive into a lake. I'm not kidding." },
      { speaker: 'Priya', text: 'Stop. Did you?' },
    ],
    tryIt: 'Use one bridge phrase to join a conversation within the first 2 minutes of being in a group.',
    scenarioId: 'house-party',
  },
  {
    id: 'opinions',
    title: 'Have a (light) opinion',
    tagline: '"I don\'t know" kills conversations. Pick a side.',
    why: "Casual opinions give people something to react to and are a great way to be fun. Low-stakes topics (food, movies, weekend plans) are perfect: take a side, exaggerate a little, and smile. Nobody will hold you to it.",
    phrases: [
      { phrase: "Honestly? I'm not a fan.", use: 'Disagree softly' },
      { phrase: "Hot take: …", use: 'Introduce an unpopular opinion playfully' },
      { phrase: "I'm gonna be honest…", use: 'Lead into a frank opinion' },
      { phrase: "I'm all for it.", use: 'Enthusiastic agreement' },
      { phrase: "It's overrated.", use: 'Playful disagreement' },
      { phrase: "I could go either way.", use: 'Neutral, but still engaged' },
      { phrase: "Okay, fair.", use: 'Concede a point gracefully' },
    ],
    example: [
      { speaker: 'Lena', text: 'Brunch this Sunday?' },
      { speaker: 'You', text: "Hot take: brunch is just overpriced breakfast. But I'm in for the coffee." },
      { speaker: 'Lena', text: 'Wow. Okay. You can pay for my mimosa then.' },
    ],
    tryIt: 'Next time someone asks "what do you think?", answer with a clear side plus a reason.',
    scenarioId: 'group-chat',
  },
  {
    id: 'share',
    title: 'Share a little about you',
    tagline: 'Questions get the ball rolling; sharing makes a connection.',
    why: "If you only ask questions, people feel interviewed and learn nothing about you. After you respond to someone, add one small personal detail. That's what people latch onto and ask you about.",
    phrases: [
      { phrase: "I'm actually from…, so…", use: 'Your background as a hook' },
      { phrase: "I've been getting into… lately.", use: 'Share a hobby' },
      { phrase: "Not gonna lie, I…", use: 'Honest/funny personal confession' },
      { phrase: "Back home we…", use: 'Cultural comparison (great conversation fuel)' },
      { phrase: "I'm the kind of person who…", use: 'Self-description, often funny' },
    ],
    example: [
      { speaker: 'Tom', text: 'This place has the best kebab in town.' },
      { speaker: 'You', text: "Okay, I'm from Iran, so I'm gonna be the judge of that." },
      { speaker: 'Tom', text: 'Ooh, pressure! Okay, what makes a good one?' },
    ],
    tryIt: 'Answer a question with your answer + one extra personal detail.',
    scenarioId: 'meetup',
  },
  {
    id: 'humor',
    title: 'Be playful (humor basics)',
    tagline: "You don't need jokes. You need playfulness.",
    why: "American casual humor is mostly exaggeration, light self-deprecation, and teasing friends gently. These work even in a second language because they don't depend on wordplay. Rule: tease situations and yourself first; tease people only when you know them and it's clearly affectionate.",
    phrases: [
      { phrase: 'I literally died.', use: 'Exaggeration: something was embarrassing/funny' },
      { phrase: 'That was the longest five minutes of my life.', use: 'Exaggerating something awkward' },
      { phrase: "Don't judge me, but…", use: 'Self-deprecating setup' },
      { phrase: 'Ten out of ten, would not recommend.', use: 'Ironic review of a bad experience' },
      { phrase: "Who hurt you?", use: 'Teasing a friend about a strong opinion' },
      { phrase: "I'm never letting you live this down.", use: 'Affectionate teasing' },
      { phrase: "Classic.", use: 'Dry reaction to something predictable' },
    ],
    example: [
      { speaker: 'Ana', text: 'I put pineapple on my pizza.' },
      { speaker: 'You', text: 'Wow. Who hurt you?' },
      { speaker: 'Ana', text: "It's good!" },
      { speaker: 'You', text: "Don't judge me, but I tried it once and I kinda liked it." },
    ],
    tryIt: 'Use one exaggeration and one self-deprecating line this week.',
    scenarioId: 'group-chat',
  },
  {
    id: 'stories',
    title: 'Tell a short story',
    tagline: 'Setup → problem → twist → reaction. Under 45 seconds.',
    why: "Stories are how people bond. Keep them short, use the present tense for drama ('So I'm standing there…'), and end on how you felt or a punchline. Don't over-explain; pauses and reactions from listeners are part of it.",
    phrases: [
      { phrase: 'So this one time…', use: 'Start a story' },
      { phrase: "So I'm standing there, and…", use: 'Present tense for drama' },
      { phrase: 'And out of nowhere…', use: 'The twist' },
      { phrase: 'Long story short…', use: 'Skip boring details' },
      { phrase: 'And that was the end of that.', use: 'Wrap up with a laugh' },
      { phrase: 'Anyway, lesson learned.', use: 'Self-deprecating ending' },
    ],
    example: [
      { speaker: 'You', text: "So this one time I'm at a job interview, super nervous, and I go to shake the guy's hand…" },
      { speaker: 'You', text: '…and out of nowhere I say "you too!" when he says "nice to meet you"… before he even finished.' },
      { speaker: 'Chris', text: 'Ha! Did you get the job?' },
      { speaker: 'You', text: 'I did, actually. Anyway, lesson learned: shut up and shake.' },
    ],
    tryIt: 'Prepare one 30-second funny story about yourself you can reuse anywhere.',
    scenarioId: 'dinner-stories',
  },
  {
    id: 'keep-going',
    title: 'Rescue a dying conversation',
    tagline: 'Silence is normal. Here\'s how to restart.',
    why: "Every conversation hits a pause. Shy people often assume it's their fault and leave. Instead: go back to an earlier topic ('callback'), comment on the shared environment, or ask an easy opinion question.",
    phrases: [
      { phrase: 'Wait, going back to what you said about…', use: 'Callback to earlier topic' },
      { phrase: 'Okay, random question…', use: 'Fun pivot' },
      { phrase: 'Have you been here before?', use: 'Shared environment' },
      { phrase: 'Got any plans for the weekend?', use: 'Safe classic' },
      { phrase: 'Anyway, I should let you go, but this was fun!', use: 'Exit gracefully' },
    ],
    example: [
      { speaker: 'Dana', text: 'Yeah…' },
      { speaker: 'You', text: 'Okay, random question: if you could only eat one cuisine forever, what would it be?' },
      { speaker: 'Dana', text: 'Oh, that is hard. Mexican. Easily.' },
    ],
    tryIt: 'Keep two "restart" questions in your pocket before you go to an event.',
    scenarioId: 'gym-small-talk',
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getMove(id: string): MoveLesson | undefined {
  return MOVES.find((m) => m.id === id);
}
