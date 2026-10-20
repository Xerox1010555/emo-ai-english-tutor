import type { CEFRLevel, Skill } from './types';

export interface LessonContent {
  title: string;
  skill: Skill;
  level: CEFRLevel;
  durationMinutes: number;
  content: string;
  vocab?: { word: string; definition: string; example: string }[];
}

export const lessonBank: LessonContent[] = [
  {
    title: 'Present Simple Habits',
    skill: 'Grammar',
    level: 'A1',
    durationMinutes: 12,
    content: `The Present Simple describes habits, routines, and facts.

Structure:
• I / you / we / they + base verb
• He / she / it + verb + s

Examples:
• I drink coffee every morning.
• She walks to work.
• The sun rises in the east.

Key signal words: always, usually, often, sometimes, never, every day.

Negative: I don't drink tea. She doesn't drive.
Question: Do you play tennis? Does he cook?`,
    vocab: [
      { word: 'habit', definition: 'A regular practice or routine', example: 'Reading before bed is my habit.' },
      { word: 'routine', definition: 'A sequence of actions regularly followed', example: 'My morning routine includes exercise.' },
    ],
  },
  {
    title: 'Past Simple & Regular Verbs',
    skill: 'Grammar',
    level: 'A2',
    durationMinutes: 15,
    content: `The Past Simple describes completed actions in the past.

Regular verbs: add -ed (walk → walked, play → played)
Irregular: go → went, see → saw, eat → ate, buy → bought

Structure:
• Affirmative: Subject + past verb
• Negative: Subject + didn't + base verb
• Question: Did + subject + base verb?

Examples:
• I visited Paris last summer.
• She didn't call me yesterday.
• Did they enjoy the movie?

Signal words: yesterday, last week, ago, in 2010.`,
    vocab: [
      { word: 'journey', definition: 'An act of travelling from one place to another', example: 'Our journey took three hours.' },
      { word: 'memorable', definition: 'Worth remembering; easily remembered', example: 'It was a memorable trip.' },
    ],
  },
  {
    title: 'Present Perfect vs Past Simple',
    skill: 'Grammar',
    level: 'B1',
    durationMinutes: 18,
    content: `The Present Perfect connects the past to the present. The Past Simple is for finished time.

Present Perfect: have/has + past participle
• Use for: unfinished time, experience, recent events
• "I have lived here for five years." (still live here)
• "Have you ever been to Japan?"

Past Simple:
• Use for: finished time periods
• "I lived in London in 2019." (no longer live there)

Key difference:
• "I have lost my keys." (I still don't have them — relevant now)
• "I lost my keys yesterday." (past event, may have found them since)

Signal words:
• Present Perfect: ever, never, just, already, yet, for, since
• Past Simple: yesterday, ago, last week, in 2020`,
    vocab: [
      { word: 'accomplish', definition: 'To achieve or complete successfully', example: 'She accomplished her goal of running a marathon.' },
      { word: 'persistent', definition: 'Continuing firmly despite difficulty', example: 'His persistent effort paid off.' },
    ],
  },
  {
    title: 'Conditionals & Hypotheticals',
    skill: 'Grammar',
    level: 'B2',
    durationMinutes: 20,
    content: `English has four main conditional structures:

Zero Conditional (facts):
• If + present, present
• "If water reaches 100°C, it boils."

First Conditional (likely future):
• If + present, will + base
• "If it rains, I'll stay home."

Second Conditional (hypothetical present/future):
• If + past, would + base
• "If I had more time, I would travel."

Third Conditional (past regret/imagination):
• If + past perfect, would have + past participle
• "If I had studied harder, I would have passed."

Mixed: "If I had saved money (past), I would be rich now (present)."`,
    vocab: [
      { word: 'hypothetical', definition: 'Based on a possible situation rather than fact', example: 'That\'s a hypothetical question.' },
      { word: 'consequence', definition: 'A result or effect of an action', example: 'Every decision has consequences.' },
    ],
  },
  {
    title: 'Inversion & Emphasis',
    skill: 'Grammar',
    level: 'C1',
    durationMinutes: 22,
    content: `Inversion is used for emphasis, especially with negative adverbials.

After negative adverbials (never, rarely, hardly, seldom, no sooner):
• "Never have I seen such beauty."
• "Rarely does he make mistakes."
• "Hardly had I arrived when the phone rang."
• "No sooner had she sat down than the doorbell rang."

Only + time/place:
• "Only after the meeting did I understand."

So + adjective:
• "So beautiful was the view that we stayed for hours."

Such + be:
• "Such was her talent that everyone admired her."

Inversion adds formality and dramatic effect. Use sparingly in speech, more in writing.`,
    vocab: [
      { word: 'scarcity', definition: 'The state of being in short supply', example: 'The scarcity of resources drove prices up.' },
      { word: 'paradox', definition: 'A seemingly contradictory statement that may be true', example: 'It\'s a paradox that more choices can lead to less satisfaction.' },
    ],
  },
  {
    title: 'Essential Daily Vocabulary',
    skill: 'Vocabulary',
    level: 'A1',
    durationMinutes: 10,
    content: `Building a strong daily vocabulary foundation.

Common action verbs:
• get up, eat, drink, walk, talk, read, write, work, sleep

Common objects:
• book, phone, car, house, food, water, clothes, money

Common adjectives:
• big, small, good, bad, new, old, fast, slow, happy, sad

Practice technique: Name 5 objects around you in English. Then describe what you do with each one.

Example: "This is a cup. I drink water from it. It is small and white."`,
    vocab: [
      { word: 'essential', definition: 'Absolutely necessary; extremely important', example: 'Water is essential for life.' },
      { word: 'comfortable', definition: 'Providing physical ease and relaxation', example: 'This chair is very comfortable.' },
    ],
  },
  {
    title: 'Phrasal Verbs for Daily Life',
    skill: 'Vocabulary',
    level: 'B1',
    durationMinutes: 16,
    content: `Phrasal verbs are essential for natural English.

Daily life:
• wake up — stop sleeping
• get up — leave your bed
• look after — take care of
• give up — stop trying
• carry on — continue
• figure out — understand/solve
• turn out — result / happen in the end
• run out of — have no more of something

Examples:
• "I need to look after my sister's kids."
• "Don't give up — you're making progress."
• "We've run out of milk."

Tip: Learn phrasal verbs in context, not in isolation. Write a sentence about your own life using each one.`,
    vocab: [
      { word: 'diligent', definition: 'Showing care and effort in work', example: 'She is a diligent student.' },
      { word: 'reluctant', definition: 'Unwilling and hesitant', example: 'He was reluctant to ask for help.' },
    ],
  },
  {
    title: 'Academic & Formal Vocabulary',
    skill: 'Vocabulary',
    level: 'C1',
    durationMinutes: 25,
    content: `Advanced vocabulary for academic and professional contexts.

Analysis words:
• scrutinize — examine closely
• synthesize — combine ideas into a unified whole
• extrapolate — extend findings beyond known data
• corroborate — confirm with additional evidence

Argumentation:
• substantiate — provide evidence to support
• refute — prove wrong with evidence
• concede — admit a point in argument
• stipulate — specify a condition

Transition words:
• furthermore, moreover, consequently, nevertheless, notwithstanding

Example: "The data substantiate the hypothesis; nevertheless, further research is needed to corroborate these findings across diverse populations."`,
    vocab: [
      { word: 'corroborate', definition: 'Confirm or support with additional evidence', example: 'Witness statements corroborated the CCTV footage.' },
      { word: 'extrapolate', definition: 'Extend known data to estimate unknown values', example: 'We can extrapolate future trends from this data.' },
    ],
  },
  {
    title: 'Active Listening Skills',
    skill: 'Listening',
    level: 'B1',
    durationMinutes: 15,
    content: `Developing your listening comprehension.

Key strategies:
1. Listen for gist first — understand the main idea before details.
2. Listen for specific information — names, numbers, dates, places.
3. Notice intonation — rising tone often means a question or uncertainty.
4. Catch connected speech — "going to" sounds like "gonna", "want to" like "wanna".

Practice: Listen to a short English podcast or news clip. Then:
• Summarize the main point in one sentence.
• List three specific details you caught.
• Note any word you didn't recognize and look it up.

Common listening traps:
• Homophones: their/there, hear/here, weather/whether
• Numbers: thirteen vs thirty, fourteen vs forty`,
    vocab: [
      { word: 'gist', definition: 'The substance or essence of a matter', example: 'I got the gist of the conversation.' },
      { word: 'intonation', definition: 'The rise and fall of voice in speaking', example: 'Her intonation suggested she was asking a question.' },
    ],
  },
  {
    title: 'Speaking with Confidence',
    skill: 'Speaking',
    level: 'B2',
    durationMinutes: 18,
    content: `Building fluency and natural speech.

Techniques for smoother speech:
1. Use filler phrases naturally: "Well...", "You know...", "I mean...", "Actually..."
2. Paraphrase when you don't know a word — don't stop.
3. Use discourse markers: "On the other hand", "That said", "By the way"
4. Vary your sentence length — mix short and long for rhythm.

Speaking practice routine:
• Talk about your day for 2 minutes without stopping.
• Record yourself and listen back.
• Describe a photo or scene in detail.
• Debate both sides of a simple topic.

Fluency over accuracy: In conversation, keeping the flow matters more than perfect grammar. You can polish accuracy in writing.`,
    vocab: [
      { word: 'articulate', definition: 'Express thoughts clearly and effectively', example: 'She articulated her ideas well.' },
      { word: 'eloquent', definition: 'Fluent and persuasive in speaking', example: 'His eloquent speech moved the audience.' },
    ],
  },
  {
    title: 'Writing Clear Paragraphs',
    skill: 'Writing',
    level: 'B2',
    durationMinutes: 20,
    content: `Structure is the backbone of good writing.

Paragraph structure:
• Topic sentence — states the main idea
• Supporting sentences — evidence, examples, explanation
• Concluding sentence — wraps up or transitions

Cohesion tools:
• Reference: this, these, such, the former, the latter
• Substitution: one, do so, the same
• Linking words: however, therefore, in addition, by contrast

Common mistakes to avoid:
• Topic sentence buried in the middle
• Too many short, choppy sentences
• No logical flow between ideas

Practice: Write a paragraph about a skill you want to learn. Start with a clear topic sentence, give two reasons with examples, and end with a concluding thought.`,
    vocab: [
      { word: 'coherent', definition: 'Logical and consistent', example: 'Her argument was coherent and well-structured.' },
      { word: 'concise', definition: 'Brief but comprehensive', example: 'Write a concise summary.' },
    ],
  },
  {
    title: 'Reading for Inference',
    skill: 'Reading',
    level: 'C1',
    durationMinutes: 22,
    content: `Advanced reading goes beyond literal comprehension.

Types of inference:
• Author's tone: Is it neutral, critical, ironic, enthusiastic?
• Implied meaning: What is suggested but not stated?
• Purpose: Why did the author write this? To inform, persuade, entertain?
• Bias: What perspective or assumptions shape the text?

Signal words for tone:
• Neutral: indicates, suggests, according to
• Critical: fails, overlooks, problematic, questionable
• Enthusiastic: remarkable, groundbreaking, compelling

Practice: Read an opinion article. Identify:
1. The author's main claim.
2. Two pieces of evidence used.
3. The tone and how you detected it.
4. One assumption the author makes but doesn't state.`,
    vocab: [
      { word: 'inference', definition: 'A conclusion reached from evidence and reasoning', example: 'We can draw an inference from the data.' },
      { word: 'nuance', definition: 'A subtle difference in meaning or quality', example: 'She understood the nuance of his remark.' },
    ],
  },
];

export function getLessonForLevel(level: CEFRLevel, skill?: Skill): LessonContent {
  const matching = lessonBank.filter(
    (l) => l.level === level && (!skill || l.skill === skill)
  );
  if (matching.length > 0) return matching[Math.floor(Math.random() * matching.length)];
  // Find closest level
  const all = skill ? lessonBank.filter((l) => l.skill === skill) : lessonBank;
  return all[Math.floor(Math.random() * all.length)];
}
