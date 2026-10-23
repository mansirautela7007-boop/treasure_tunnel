/* Treasure Tunnel – all script content, taken from the "Story" and "Game" tabs.
   Levels are data: the engine reads everything from here.
   delta = signed movement on the number line (answer = start + delta). */

const STORY_INTRO = [
  { bg: 'bg_entrance', scene: 'hook', who: 'narrator', clip: 'narrator_1',
    text: 'Deep inside the Treasure Tunnel, an explorer is searching for hidden treasure.' },
  { bg: 'bg_tunnel', scene: 'wizardAppears', who: 'wizard',
    text: 'Hahaha! You just have one piece of map.' },
  { bg: 'bg_tunnel', scene: 'readyWizard', who: 'wizard',
    text: 'Solve the mysteries to reach the treasure.' },
  { bg: 'bg_tunnel', scene: 'ready', who: 'explorer',
    text: 'Let’s solve the puzzles. I will uncover the map and find the hidden treasure.' },
];

const STORY_END = [
  { bg: 'bg_final_path', scene: 'praise', who: 'wizard',
    text: 'Hahaha! You did it!' },
  { bg: 'bg_final_path', scene: 'title', who: 'wizard',
    text: 'You’re a real treasure master!' },
  { bg: 'bg_final_path', scene: 'goTreasure', who: 'wizard',
    text: 'Go ahead and collect your treasure!' },
  { bg: 'bg_final_path', scene: 'run' }, // no line in the script: the explorer runs to the chest
  { bg: 'bg_treasure_chamber', scene: 'found', who: 'explorer',
    text: 'Whoa! I found it!' },
  { bg: 'bg_treasure_chamber', scene: 'open', who: 'explorer',
    text: 'Whoa! Best treasure hunt ever. Yayy!' },
];

const OOPS_KEY = 'Oops! No key here. Look where the explorer stopped.';
const OOPS_MAP = 'Oops! That didn’t reveal the path. Try again.';

const LEVELS = [
  /* ---------------- LEVEL 1 ---------------- */
  {
    name: 'Amber Tunnel', bg: 'bg_level1_amber_tunnel', ledge: 0.579,
    // cavern look: floating platforms, top banner, arrow buttons + CHECK (art in assets/ui_*.webp when present)
    theme: 'cavern', step: 128, explorerH: 140, submit: 'JUMP',
    // VO only as scripted (no extra move prompt); the sign shows only while there is on-screen text
    voOnly: true, signOnlyWithOst: true,
    helpRules: true, // the ? button opens a dropdown of the direction rules
    keyBox: true, // a hidden box above the right stone: the explorer's jump knocks it into view and the key pops out
    mapScroll: true, // map puzzles on a parchment scroll; the map shows between puzzles
    artMap: true, // unlock + between puzzles use the path illustration (dimmed, route lighting up) instead of the map
    // path reveal: assets/path_reveal_ch1.webp (1446×935); the explorer walks this route (art pixels)
    pathArt: { img: 'path_reveal_ch1', w: 1446, h: 935, route: [[53, 359], [173, 353], [268, 313], [303, 343], [338, 376], [418, 393], [463, 443], [508, 508], [558, 527], [598, 559], [678, 566], [758, 579], [798, 510], [878, 519], [958, 505], [1038, 528], [1078, 464], [1098, 448], [1163, 473], [1213, 533], [1298, 561], [1403, 568]] },
    // no badge: Chamber 1 goes straight on to Chamber 2
    rule: [['+', 'Add', 'right'], ['−', 'Subtract', 'left']],
    teach: [ // script: Game V3, Level 1 Teaching
      { type: 'zero', who: 'wizard', text: 'Watch carefully! The tunnel has a little trick.' },
      { type: 'arrows', who: 'wizard',
        text: 'To add the numbers, you have to move to the right. To subtract, you have to move to the left.' },
      { type: 'say', who: 'explorer', text: 'Ohh! Got it.', pose: 'explorer_thumbsup' },
    ],
    keysIntro: 'Move in the correct direction to find your keys.',
    keys: [
      { start: 0, delta: 3, eq: '0 + 3 = ?', cele: 'KEY FOUND!', size: 'small', coach: true, tapStones: true, // how to play: a guided tour of every control
        vo: 'The next key is at.',
        found: 'Correct! You found it. The key is right here.',
        wrong: ['Oops! No key is here. Try again.', 'Move 3 steps forward from 0.', 'Look closely at where the explorer reaches.'],
        idle: 'Follow the explorer and see where he reaches.' },
      { start: 7, delta: -4, eq: '(+7) − 4 = ?', cele: '+1 KEY', size: 'small', tapStones: true,
        vo: 'The next key is at.',
        found: 'Correct! You found it. The explorer reached +3. The key is right here.',
        wrong: ['Oops! No key is here. Try again.', 'Move 4 steps backward from 7.', 'Check where the explorer reaches after moving back.'],
        idle: 'Watch carefully. Where does the explorer reach?' },
      { start: -10, delta: 7, eq: '(−10) + 7 = ?', cele: 'KEY COLLECTED!', size: 'medium',
        vo: 'The next key is at.',
        found: 'Correct! You found it. The explorer reached −3. The key is right here.',
        wrong: ['Oops! No key is here. Try again.', 'Move 7 steps forward from −10.', 'Look closely at where the explorer reaches.'],
        idle: 'Follow each step and find where the explorer reaches.' },
      { start: 1, delta: -8, eq: '(+1) − 8 = ?', cele: '+1 KEY', size: 'small',
        vo: 'The next key is at.',
        found: 'Correct! You found it. The explorer reached −7. The key is right here.',
        wrong: ['Oops! No key is here. Try again.', 'Move 8 steps backward from 1.', 'Keep counting until the explorer stops.'],
        idle: 'Watch carefully as the explorer moves past 0.' },
      { start: -7, delta: -7, eq: '(−7) − 7 = ?', cele: 'FINAL KEY FOUND!', size: 'big',
        vo: 'The next key is at.',
        found: 'Correct! You found it. The explorer reached −14. The key is right here.',
        wrong: ['Oops! No key is here. Try again.', 'Move 7 steps backward from −7.', 'Look where the explorer reaches after 7 steps.'],
        idle: 'The last key is waiting! Follow the explorer carefully.' },
    ],
    mapIntro: [
      { who: 'explorer', text: 'I got it! Now, I have a map to reach the treasure.' },
      { who: 'wizard', text: 'Hahaha! Only one piece of map found! Two more to go.' },
      { who: 'wizard', text: 'Solve the map puzzles to reveal the further path.', vo: true },
    ],
    mysteries: [
      { start: 7, delta: 6, eq: '(+7) + 6 = ?', tutorial: true, coach: true, // guided tour of the keypad
        correct: 'Correct! You reached +13. Part of the path is revealed!',
        wrong: ['', '', ''] /* the script has no wrong-answer lines for this puzzle */,
        idle: 'Start at +7 and follow the 6 steps to the right.' },
      { start: 9, delta: -5, eq: '(+9) − 5 = ?',
        correct: 'Correct! More of the path is revealed.',
        wrong: ['Oops! Try again.', 'You’re subtracting, so which way should you move?', 'Start at +9 and count 5 steps to the left.'],
        idle: 'Solve the puzzle to reveal more of the path.' },
      { start: -12, delta: 7, eq: '(−12) + 7 = ?',
        correct: 'Correct! The path is almost complete.',
        wrong: ['Oops! Try again.', 'You’re adding, so which way should you move?', 'Start at −12 and count 7 steps to the right.'],
        idle: 'Solve the puzzle to reveal more of the path.' },
      { start: 11, delta: -12, eq: '(+11) − 12 = ?',
        correct: 'Correct! The path is revealed!',
        wrong: ['Oops! Try again.', 'You’re subtracting, so which way should you move?', 'Start at +11 and count 12 steps to the left.'],
        idle: 'Solve the last puzzle to reveal the path.' },
    ],
    hint3: 'tokens', // third wrong try: the equation's numbers pulse (no number strip)
    unlock: { wizard: null, explorer: 'Yayy!' }, // script: the explorer cheers; the wizard has no line here
    revealed: { ost: 'NEXT PATH REVEALED!', idle: 'Follow the path to the next chamber.' }, // no lines here in the script
  },

  /* ---------------- LEVEL 2 ---------------- */
  {
    name: 'Shadow Chamber', bg: 'bg_level2_shadow_chamber', ledge: 0.579,
    // Chamber 1's look on Chamber 2's own background; map puzzles on the scroll
    theme: 'cavern', step: 128, explorerH: 140, submit: 'JUMP', mapScroll: true,
    artMap: true, // unlock + between puzzles use the path illustration, like Chamber 1
    voOnly: true, // each key's own line is the instruction (no extra move prompt)
    helpRules: true, // the ? button opens a dropdown of the direction rules
    keyBox: true, // the hidden key box above the right stone, as in Chamber 1
    // no badge: the chamber goes straight on
    rule: [['+(−)', 'Add a negative', 'left']],
    teach: [
      // script, Level 2 "Transition and teaching (Rule 1)"
      { type: 'wizardIn', who: 'wizard', text: 'Haha! This path is different. The puzzles are different too!' },
      { type: 'say', who: 'wizard', text: 'There is a little twist!' },
      { type: 'flip', from: 'right', to: 'left', who: 'wizard',
        text: 'To add numbers we have to move to the right, but when there is another sign, change your direction.' },
      { type: 'understand', from: 'right', to: 'left', who: 'explorer', text: 'Oh! Got it! I’m ready.' },
    ],
    keysIntro: 'Move in the correct direction to find your keys.',
    keys: [
      { start: -2, delta: -3, eq: '(−2) + (−3) = ?', cele: 'KEY FOUND!', size: 'small',
        vo: 'The next key is at.',
        found: 'Correct! You found it. The key is at −5.',
        wrong: ['Oops! Try again.', 'Remember, adding a negative changes the direction. Move left.', 'Start at −2 and count 3 steps to the left.'],
        idle: 'Follow the path and find where he reaches.' },
      { start: 9, delta: -2, eq: '(+9) + (−2) = ?', cele: '+1 KEY', size: 'small',
        vo: 'The next key is at.',
        found: 'Correct! You found it. The key is at +7.',
        wrong: ['Oops! Try again.', 'You’re adding a negative, so the explorer needs to move left.', 'Start at +9 and count 2 steps to the left.'],
        idle: 'Watch which way the explorer moves when a negative is added.' },
      { start: -5, delta: -5, eq: '(−5) + (−5) = ?', cele: 'KEY COLLECTED!', size: 'medium',
        vo: 'The next key is at.',
        found: 'Correct! You found it. The key is at −10.',
        wrong: ['Oops! Try again.', 'Adding a negative sends the explorer to the left.', 'Start at −5 and count 5 steps to the left.'],
        idle: 'Follow the path carefully and count each step.' },
      { start: -11, delta: -4, eq: '(−11) + (−4) = ?', cele: '+1 KEY', size: 'small',
        vo: 'The next key is at.',
        found: 'Correct! You found it. The key is at −15.',
        wrong: ['Oops! Try again.', 'Check the negative number being added. It changes the path to the left.', 'Start at −11 and count 4 steps to the left.'],
        idle: 'Remember the twist: add a negative, then move left.' },
      { start: 15, delta: -4, eq: '(+15) + (−4) = ?', cele: 'FINAL KEY FOUND!', size: 'big',
        vo: 'The next key is at.',
        found: 'Correct! You found it. The key is at +11.',
        wrong: ['Oops! Try again.', 'Adding a negative changes the direction. The explorer moves left.', 'Start at +15 and count 4 steps to the left.'],
        idle: 'The last key is waiting! Check the sign and follow the explorer.' },
    ],
    mapIntro: [
      { who: 'wizard', text: 'Hahaha! Another piece of map found! One more to go.' },
      { who: 'wizard', text: 'Solve the map puzzles to reveal the further path.', vo: true },
    ],
    mysteries: [
      { start: 7, delta: -5, eq: '(+7) + (−5) = ?',
        correct: 'Nice! You got it!',
        wrong: ['Oops! Try again.', 'Remember, adding a negative changes the direction.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: -5, delta: -9, eq: '(−5) + (−9) = ?',
        correct: 'Great job! Keep going!',
        wrong: ['Oops! Try again.', 'You’re adding a negative. Think about the direction the explorer would take.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: 12, delta: -14, eq: '(+12) + (−14) = ?',
        correct: 'Well done! The path is almost complete.',
        wrong: ['Oops! Try again.', 'Adding a negative changes the direction. Think carefully.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: -11, delta: -12, eq: '(−11) + (−12) = ?',
        correct: 'Great! The path is revealed!',
        wrong: ['Oops! Try again.', 'You’re adding a negative. Remember the path changes direction.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
    ],
    hint3: 'tokens',
    unlock: { wizard: null, explorer: null }, // no lines here in the script
    revealed: { ost: 'NEXT PATH REVEALED!', idle: 'Follow the path to the next chamber.' }, // no lines here in the script
  },

  /* ---------------- LEVEL 3 ---------------- */
  {
    name: 'Crystal Cavern', bg: 'bg_level3_lava', stones: 'lava', ledge: 0.579, // lava cavern and lava stones throughout
    // same look as Chamber 1; prompt stays general so it doesn't give away the direction
    theme: 'cavern', step: 128, explorerH: 140, submit: 'JUMP',
    mapScroll: true, artMap: true, // map puzzles on the scroll; unlock + between puzzles use the path illustration, like Chamber 1
    voOnly: true, // each key's own line is the instruction (no extra move prompt)
    helpRules: true, // the ? button opens a dropdown of the direction rules
    keyBox: true, // the hidden key box above the right stone, as in Chamber 1
    // no badge: the chamber goes straight on
    rule: [['−(−)', 'Subtract a negative', 'right']],
    teach: [
      // script, Level 3 "Teaching"
      { type: 'wizardIn', who: 'wizard', text: 'Hahaha! This path is difficult and the puzzles are different too.' },
      { type: 'say', who: 'wizard', text: 'There is another little twist!' },
      { type: 'flip', from: 'left', to: 'right', who: 'wizard',
        text: 'To subtract numbers we have to move to the left, but when there is another sign, change your direction.' },
      { type: 'understand', from: 'left', to: 'right', who: 'explorer', text: 'Oh! Got it. I’m ready!' },
    ],
    keysIntro: 'Move in the correct direction to find your key.',
    keys: [
      { start: -3, delta: 4, eq: '(−3) − (−4) = ?', cele: 'KEY FOUND!', size: 'small',
        vo: 'The next key is at.',
        found: 'Yes! You found it. The key is +1.',
        wrong: [OOPS_KEY, 'Remember, subtracting a negative changes the direction. Move right.', 'Start at −3 and count 4 steps to the right.'],
        idle: 'Follow the explorer’s path and find where he reaches.' },
      { start: 6, delta: 5, eq: '(+6) − (−5) = ?', cele: '+1 KEY', size: 'small',
        vo: 'The next key is at.',
        found: 'Great! You found it. The key is at +11.',
        wrong: [OOPS_KEY, 'Remember, subtracting a negative changes the direction. Move right.', 'Start at +6 and count 5 steps to the right.'],
        idle: 'Check the sign and follow the explorer carefully.' },
      { start: -5, delta: 13, eq: '(−5) − (−13) = ?', cele: 'KEY COLLECTED!', size: 'medium',
        vo: 'The next key is at.',
        found: 'Nice! You found it. The key is +8.',
        wrong: [OOPS_KEY, 'Subtracting a negative changes the direction. Move right.', 'Start at −5 and count 13 steps to the right.'],
        idle: 'Watch carefully. The explorer may cross 0.' },
      { start: -11, delta: 6, eq: '(−11) − (−6) = ?', cele: '+1 KEY', size: 'small',
        vo: 'The next key is at.',
        found: 'Great! You found it. The key is at −5.',
        wrong: [OOPS_KEY, 'Check the negative number being subtracted. It changes the direction to the right.', 'Start at −11 and count 6 steps to the right.'],
        idle: 'Remember the twist: subtract a negative, then move right.' },
      { start: 15, delta: 4, eq: '(+15) − (−4) = ?', cele: 'FINAL KEY FOUND!', size: 'big',
        vo: 'The next key is at.',
        found: 'Well done! You found it. The key is at +19.',
        wrong: [OOPS_KEY, 'Subtracting a negative changes the direction. The explorer moves right.', 'Start at +15 and count 4 steps to the right.'],
        idle: 'The last key is waiting! Check the signs and follow the explorer.' },
    ],
    mapIntro: [
      { who: 'wizard', text: 'Hahaha! Last piece of map revealed!' },
      { who: 'wizard', text: 'Solve the map puzzles to reveal the final path to treasure.', vo: true },
    ],
    mysteries: [
      { start: 5, delta: 7, eq: '(+5) − (−7) = ?',
        correct: 'Nice! You got it!',
        wrong: [OOPS_MAP, 'Remember, subtracting a negative changes the direction. Move right.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: -14, delta: 9, eq: '(−14) − (−9) = ?',
        correct: 'Great job! Keep going!',
        wrong: [OOPS_MAP, 'You’re subtracting a negative. Change direction and move right.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: 11, delta: -14, eq: '(+11) − (14) = ?',
        correct: 'Well done! The path is almost complete.',
        wrong: [OOPS_MAP, 'This time you’re subtracting a positive number, so move left.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: -13, delta: 12, eq: '(−13) − (−12) = ?',
        correct: 'Great! The path is revealed!',
        wrong: [OOPS_MAP, 'Subtracting a negative changes the direction. Move right.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
    ],
    hint3: 'tokens',
    unlock: { wizard: null, explorer: 'Great! Now I know where to go next!' }, // script: only the explorer speaks here
    revealed: { ost: 'TREASURE PATH REVEALED!', idle: 'Follow the path to the treasure.' }, // no lines here in the script
  },
];

// Chamber 2's path reveal: assets/path_reveal_ch2.webp (1435×890), route across the rope bridge (art pixels)
LEVELS[1].pathArt = { img: 'path_reveal_ch2', w: 1435, h: 890, route: [[200, 336], [245, 353], [295, 363], [355, 360], [415, 366], [440, 398], [435, 428], [465, 463], [505, 476], [555, 503], [615, 528], [695, 548], [775, 548], [845, 528], [895, 536], [955, 543], [1025, 553], [1095, 558], [1155, 543], [1190, 513], [1225, 486], [1285, 478], [1345, 476], [1405, 483]] };
// Chamber 3's path reveal: assets/path_reveal_ch3.webp (1427×945), route over the stepping stones to the chest (art pixels)
LEVELS[2].pathArt = { img: 'path_reveal_ch3', w: 1427, h: 945, route: [[46, 473], [96, 479], [156, 491], [216, 509], [286, 525], [356, 519], [426, 513], [476, 501], [506, 468], [551, 448], [601, 458], [631, 485], [676, 478], [726, 493], [771, 518], [821, 531], [871, 541], [901, 538], [946, 515], [996, 503], [1046, 475], [1076, 435], [1096, 398], [1136, 383], [1176, 365], [1206, 335]] };

// default unlock lines; a chamber's own `unlock` overrides any of them
const UNLOCK = {
  wizard: null, explorer: null, // the lines come from each chamber's own `unlock` (script: Game V3)
  ost: 'MAP PIECE UNLOCKED!',
  idle: 'Use your keys to unlock the map piece.',
};

const FINAL_BADGE = { name: 'True Treasure Tunnel Explorer', color: '#F5C542', dark: '#9A6B00', icon: 'chest' };

/* QA panel: Q opens it, N auto-solves. Set to false before release to hide it. */
const QA_PANEL = true;

/* Layout editor: E opens it. Edits show in the game while this is true. Set to false before release. */
const EDITOR = true;

/* Recorded character voices (assets/audio/vo_*.m4a): "who|line" → clip. Made with the Mac voices
   Grandpa (UK) for the wizard and Eddy (US) for the explorer; a line not listed here uses the browser's voice. */
const CHARACTER_VO = {
 "wizard|Hahaha! You just have one piece of map.": "vo_wizard_01",
 "wizard|Solve the mysteries to reach the treasure.": "vo_wizard_02",
 "explorer|Let’s solve the puzzles. I will uncover the map and find the hidden treasure.": "vo_explorer_01",
 "wizard|Hahaha! You did it!": "vo_wizard_03",
 "wizard|You’re a real treasure master!": "vo_wizard_04",
 "wizard|Go ahead and collect your treasure!": "vo_wizard_05",
 "explorer|Whoa! I found it!": "vo_explorer_02",
 "explorer|Whoa! Best treasure hunt ever. Yayy!": "vo_explorer_03",
 "wizard|You found all the keys! Now unlock the map piece.": "vo_wizard_06",
 "explorer|Great! Now I know where to go next!": "vo_explorer_04",
 "wizard|Look closely!": "vo_wizard_07",
 "wizard|When you have to add, you’ll move to the right. When you have to subtract, you’ll move to the left.": "vo_wizard_08",
 "wizard|You found your keys! Here is your map piece.": "vo_wizard_09",
 "explorer|I got it! Now, I have the map to reach the treasure.": "vo_explorer_05",
 "wizard|Hahaha! You found just one piece of map! But you need 2 more map pieces to reach the treasure.": "vo_wizard_10",
 "wizard|Hahaha! You solved this level. The next map piece is here!": "vo_wizard_11",
 "explorer|There it is! Let’s go!": "vo_explorer_06",
 "wizard|Haha! This path is different. The puzzles are different too!": "vo_wizard_12",
 "wizard|There is a little twist!": "vo_wizard_13",
 "wizard|To add numbers we have to move to the right, but when there is another sign, change your direction.": "vo_wizard_14",
 "explorer|Oh! Got it! I’m ready.": "vo_explorer_07",
 "wizard|Hahaha! You solved this level too. The next map piece is here!": "vo_wizard_15",
 "wizard|Hahaha! You solved all the map puzzles. The next path is open!": "vo_wizard_16",
 "wizard|Hahaha! This path is difficult and the puzzles are different too.": "vo_wizard_17",
 "wizard|There is another little twist!": "vo_wizard_18",
 "wizard|To subtract numbers we have to move to the left, but when there is another sign, change your direction.": "vo_wizard_19",
 "explorer|Oh! Got it. I’m ready!": "vo_explorer_08",
 "wizard|You found all the keys. Here is your last map piece.": "vo_wizard_20",
 "wizard|Hahaha! You solved all the puzzles.": "vo_wizard_21",
 "explorer|The treasure path! Let’s go!": "vo_explorer_09"
};

/* Recorded voice-overs (ElevenLabs, assets/audio/el_*.mp3): game line → clip, or clips played one after another.
   A line listed here always uses its recording; other lines use the clips above or the browser's voice. */
const RECORDED_VO = {
 "Hahaha! You just have one piece of map.": "el_wizard_081137",
 "Solve the mysteries to reach the treasure.": "el_wizard_081156",
 "Let’s solve the puzzles. I will uncover the map and find the hidden treasure.": [
  "el_explorer_01",
  "el_explorer_02"
 ],
 "Hahaha! You did it!": "el_wizard_081321",
 "You’re a real treasure master!": "el_wizard_081332",
 "Go ahead and collect your treasure!": "el_wizard_081409",
 "Whoa! I found it!": "el_explorer_09",
 "Whoa! Best treasure hunt ever. Yayy!": "el_explorer_10",
 "Watch carefully! The tunnel has a little trick.": "el_wizard_081419",
 "To add the numbers, you have to move to the right. To subtract, you have to move to the left.": {
  "clip": "el_wizard_081436",
  "end": 7.55
 },
 "Ohh! Got it.": "el_explorer_12",
 "Move in the correct direction to find your keys.": "el_wizard_081445",
 "Move in the correct direction to find your key.": "el_wizard_081445",
 "The next key is at.": "el_wizard_081456",
 "Correct! You found it. The key is right here.": "el_wizard_081508",
 "Oops! No key is here. Try again.": "el_wizard_081519",
 "Move 3 steps forward from 0.": "el_wizard_081531",
 "Look closely at where the explorer reaches.": "el_wizard_081619",
 "Follow the explorer and see where he reaches.": "el_wizard_081632",
 "Correct! You found it. The explorer reached +3. The key is right here.": "el_wizard_081647",
 "Move 4 steps backward from 7.": "el_wizard_081659",
 "Check where the explorer reaches after moving back.": "el_wizard_081711",
 "Watch carefully. Where does the explorer reach?": "el_wizard_081723",
 "Follow each step and find where the explorer reaches.": "el_wizard_081801",
 "Correct! You found it. The explorer reached −7. The key is right here.": "el_wizard_090514",
 "Move 8 steps backward from 1.": "el_wizard_090523",
 "Keep counting until the explorer stops.": "el_wizard_090532",
 "Watch carefully as the explorer moves past 0.": "el_wizard_090543",
 "Correct! You found it. The explorer reached −14. The key is right here.": "el_wizard_090555",
 "Look where the explorer reaches after 7 steps.": "el_wizard_090636",
 "The last key is waiting! Follow the explorer carefully.": "el_wizard_090646",
 "I got it! Now, I have a map to reach the treasure.": [
  "el_explorer_13",
  "el_explorer_14"
 ],
 "Hahaha! Only one piece of map found! Two more to go.": "el_wizard_090656",
 "Solve the map puzzles to reveal the further path.": "el_wizard_090715",
 "Correct! You reached +13. Part of the path is revealed!": "el_wizard_090747",
 "Start at +7 and follow the 6 steps to the right.": "el_wizard_090758",
 "Correct! More of the path is revealed.": "el_wizard_090807",
 "Oops! Try again.": "el_wizard_090816",
 "You’re subtracting, so which way should you move?": "el_wizard_090827",
 "Start at +9 and count 5 steps to the left.": "el_wizard_090838",
 "Solve the puzzle to reveal more of the path.": "el_wizard_090910",
 "Correct! The path is almost complete.": "el_wizard_090919",
 "You’re adding, so which way should you move?": "el_wizard_090929",
 "Correct! The path is revealed!": "el_wizard_090949",
 "Start at +11 and count 12 steps to the left.": "el_wizard_090959",
 "Solve the last puzzle to reveal the path.": "el_wizard_091032",
 "Follow the path to the next chamber.": "el_wizard_091042",
 "Haha! This path is different. The puzzles are different too!": "el_wizard_091053",
 "There is a little twist!": "el_wizard_091101",
 "To add numbers we have to move to the right, but when there is another sign, change your direction.": "el_wizard_091126",
 "Oh! Got it! I’m ready.": [
  "el_explorer_12",
  "el_explorer_03"
 ],
 "Hahaha! Another piece of map found! One more to go.": "el_wizard_091159",
 "Hahaha! This path is difficult and the puzzles are different too.": "el_wizard_091220",
 "There is another little twist!": "el_wizard_091228",
 "To subtract numbers we have to move to the left, but when there is another sign, change your direction.": "el_wizard_091312",
 "Oh! Got it. I’m ready!": [
  "el_explorer_15",
  "el_explorer_16"
 ],
 "Hahaha! Last piece of map revealed!": "el_wizard_091322",
 "Solve the map puzzles to reveal the final path to treasure.": "el_wizard_091345"
};
