/* Treasure Tunnel – all script content, taken from the "Story" and "Game" tabs.
   Levels are data: the engine reads everything from here.
   delta = signed movement on the number line (answer = start + delta). */

const STORY_INTRO = [
  { bg: 'bg_entrance', scene: 'hook', who: 'narrator', clip: 'narrator_1',
    text: 'Deep inside the Treasure Tunnel, an explorer is searching for hidden treasure.' },
  { bg: 'bg_tunnel', scene: 'lostMap', who: 'narrator', clip: 'narrator_2',
    text: 'But the map to the treasure had broken into pieces and scattered across the tunnel!' },
  { bg: 'bg_tunnel', scene: 'worried', who: 'narrator', clip: 'narrator_3',
    text: 'Uh-oh! I only have one piece of the map. How will I find the treasure now?' },
  { bg: 'bg_tunnel', scene: 'wizardAppears', who: 'wizard',
    text: 'Hahaha! Solve the puzzles to find the missing pieces of the treasure map.' },
  { bg: 'bg_tunnel', scene: 'ready', who: 'explorer',
    text: 'I’m ready! Let’s solve the puzzles.' },
  { bg: 'bg_tunnel', scene: 'readyWizard', who: 'wizard',
    text: 'And the treasure keys could be on the left or the right. Let’s find them!' },
];

const STORY_END = [
  { bg: 'bg_final_path', scene: 'praise', who: 'wizard',
    text: 'Hahaha! You solved every mystery and conquered every positive and negative path along the way!' },
  { bg: 'bg_final_path', scene: 'title', who: 'wizard',
    text: 'That makes you a true Treasure Tunnel Explorer!' },
  { bg: 'bg_final_path', scene: 'goTreasure', who: 'wizard',
    text: 'Go ahead and collect your treasure!' },
  { bg: 'bg_final_path', scene: 'run', who: 'explorer',
    text: 'This must be it! The treasure is close!' },
  { bg: 'bg_treasure_chamber', scene: 'found', who: 'explorer',
    text: 'Whoa! I found it!' },
  { bg: 'bg_treasure_chamber', scene: 'open', who: 'explorer',
    text: 'Best treasure hunt ever!' },
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
    badge: { name: 'Path Finder', color: '#F29A2E', dark: '#9A5410', icon: 'both' },
    rule: [['+', 'Add', 'right'], ['−', 'Subtract', 'left']],
    teach: [
      { type: 'zero', who: 'wizard', text: 'Look closely!' },
      { type: 'arrows', who: 'wizard',
        text: 'When you have to add, you’ll move to the right. When you have to subtract, you’ll move to the left.',
        ost: 'When you have to add, you’ll move to the right. When you have to subtract, you’ll move to the left.' },
    ],
    keys: [
      { start: 0, delta: 3, eq: '0 + 3 = ?', cele: 'KEY FOUND!', size: 'small', coach: true, // how to play: a guided tour of every control
        vo: 'You are at 0. You will find your key when you add 3 steps to 0.',
        found: 'Correct! You found it. The explorer reached +3. The key is right here.',
        wrong: [OOPS_KEY, 'Watch the explorer’s path again.', 'Look closely at where the explorer reaches.'],
        idle: 'Follow the explorer and see where he reaches.' },
      { start: 7, delta: -4, eq: '(+7) − 4 = ?', cele: '+1 KEY', size: 'small',
        vo: 'You will find your next key when you subtract 4 steps from 7.',
        found: 'Correct! You found it. The explorer reached +3. The key is right here.',
        wrong: [OOPS_KEY, 'Watch the explorer’s path again.', 'Check where the explorer reaches after moving back.'],
        idle: 'Watch carefully. Where does the explorer reach?' },
      { start: 10, delta: 7, eq: '(+10) + 7 = ?', cele: 'KEY COLLECTED!', size: 'medium',
        vo: 'You will find another key when you add 7 steps to 10.',
        found: 'Correct! You found it. The explorer reached +17. The key is right here.',
        wrong: [OOPS_KEY, 'Watch the explorer’s path again.', 'Look closely at where the explorer reaches.'],
        idle: 'Follow each step and find where the explorer reaches.' },
      { start: 1, delta: -8, eq: '(+1) − 8 = ?', cele: '+1 KEY', size: 'small',
        vo: 'You will find your next key when you subtract 8 steps from 1.',
        found: 'Correct! You found it. The explorer reached −7. The key is right here.',
        wrong: [OOPS_KEY, 'Watch the explorer’s path again.', 'Keep counting until the explorer stops.'],
        idle: 'Watch carefully as the explorer moves past 0.' },
      { start: -7, delta: -7, eq: '(−7) − 7 = ?', cele: 'FINAL KEY FOUND!', size: 'big',
        vo: 'You will find your next key when you subtract 7 steps from −7.',
        found: 'Correct! You found it. The explorer reached −14. The key is right here.',
        wrong: [OOPS_KEY, 'Watch the explorer’s path again.', 'Look where the explorer reaches after 7 steps.'],
        idle: 'The last key is waiting! Follow the explorer carefully.' },
    ],
    mapIntro: [
      { who: 'explorer', text: 'I got it! Now, I have the map to reach the treasure.' },
      { who: 'wizard', text: 'Hahaha! You found just one piece of map! But you need 2 more map pieces to reach the treasure.' },
      { who: 'wizard', text: 'Solve the map puzzle to reveal the further path.' },
    ],
    mysteries: [
      { start: 7, delta: 6, eq: '(+7) + 6 = ?', tutorial: true, coach: true, // guided tour of the keypad
        vo: 'Here’s the first puzzle. You are at +7. You have to go 6 steps ahead. Where will you reach?',
        correct: 'Correct! You reached +13. Part of the path is revealed!',
        wrong: [OOPS_MAP, 'You’re adding, so which way should you move?', 'Start at +7 and count 6 steps to the right.'],
        idle: 'Start at +7 and follow the 6 steps to the right.' },
      { start: 9, delta: -5, eq: '(+9) − 5 = ?',
        vo: 'Here’s the next puzzle. You are at +9. You have to go back 5 steps. Where will you reach?',
        correct: 'Correct! More of the path is revealed.',
        wrong: [OOPS_MAP, 'You’re subtracting, so which way should you move?', 'Start at +9 and count 5 steps to the left.'],
        idle: 'Solve the puzzle to reveal more of the path.' },
      { start: -12, delta: 7, eq: '(−12) + 7 = ?',
        vo: 'Here’s another puzzle. You are at −12. You have to go 7 steps ahead. Where will you reach?',
        correct: 'Correct! The path is almost complete.',
        wrong: [OOPS_MAP, 'You’re adding, so which way should you move?', 'Start at −12 and count 7 steps to the right.'],
        idle: 'Solve the puzzle to reveal more of the path.' },
      { start: 11, delta: -12, eq: '(+11) − 12 = ?',
        vo: 'One last puzzle. Solve it to reveal the path. You are at +11. You have to go back 12 steps. Where will you reach?',
        correct: 'Correct! The path is revealed!',
        wrong: [OOPS_MAP, 'You’re subtracting, so which way should you move?', 'Start at +11 and count 12 steps to the left.'],
        idle: 'Solve the last puzzle to reveal the path.' },
    ],
    hint3: 'tokens', // third wrong try: the equation's numbers pulse (no number strip)
    unlock: { wizard: 'You found your keys! Here is your map piece.', ost: 'MAP PIECE UNLOCKED!' },
    revealed: { ost: 'NEXT PATH REVEALED!', wizard: 'Hahaha! You solved this level. The next map piece is here!',
                explorer: 'There it is! Let’s go!', idle: 'Follow the path to the next chamber.' },
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
    badge: { name: 'Shadow Master', color: '#8B5CF6', dark: '#4C1D95', icon: 'left' },
    rule: [['+(−)', 'Add a negative', 'left']],
    teach: [
      { type: 'confused', who: 'explorer', text: 'Oh! These puzzles look different!', ost: 'Oh! These puzzles look different!' },
      { type: 'wizard', who: 'wizard', text: 'Hahaha! There is a little twist!', ost: 'Hahaha! There is a little twist!' },
      { type: 'flip', from: 'right', to: 'left', who: 'wizard',
        text: 'Adding usually takes you to the right. But when you add a negative number, you need to change the direction and move to the left.',
        ost: 'Adding usually takes you to the right. But when you add a negative number, you need to change the direction and move to the left.' },
      { type: 'understand', from: 'right', to: 'left', who: 'explorer',
        text: 'Oh! Got it! Adding means moving right, but adding a negative means changing direction and moving left!',
        ost: 'Oh! Got it! Adding means moving right, but adding a negative means changing direction and moving left!' },
    ],
    keys: [
      { start: -2, delta: -3, eq: '(−2) + (−3) = ?', cele: 'KEY FOUND!', size: 'small',
        vo: 'You are at −2. You will find your key when you add −3 to −2.',
        found: 'Correct! You found it. The explorer reached −5. The key is right here.',
        wrong: [OOPS_KEY, 'Remember, adding a negative changes the direction. Move left.', 'Start at −2 and count 3 steps to the left.'],
        idle: 'Follow the explorer’s path and find where he reaches.' },
      { start: 9, delta: -2, eq: '(+9) + (−2) = ?', cele: '+1 KEY', size: 'small',
        vo: 'You are at 9. You will find your key when you add −2 to 9.',
        found: 'Correct! You found it. The explorer reached +7. The key is right here.',
        wrong: [OOPS_KEY, 'You’re adding a negative, so the explorer needs to move left.', 'Start at +9 and count 2 steps to the left.'],
        idle: 'Watch which way the explorer moves when a negative is added.' },
      { start: -5, delta: -5, eq: '(−5) + (−5) = ?', cele: 'KEY COLLECTED!', size: 'medium',
        vo: 'You are at −5. You will find your key when you add −5 to −5.',
        found: 'Correct! You found it. The explorer reached −10. The key is right here.',
        wrong: [OOPS_KEY, 'Adding a negative sends the explorer to the left.', 'Start at −5 and count 5 steps to the left.'],
        idle: 'Follow the path carefully and count each step.' },
      { start: -11, delta: -4, eq: '(−11) + (−4) = ?', cele: '+1 KEY', size: 'small',
        vo: 'You are at −11. You will find your key when you add −4 to −11.',
        found: 'Correct! You found it. The explorer reached −15. The key is right here.',
        wrong: [OOPS_KEY, 'Check the negative number being added. It changes the path to the left.', 'Start at −11 and count 4 steps to the left.'],
        idle: 'Remember the twist: add a negative, then move left.' },
      { start: 15, delta: -4, eq: '(+15) + (−4) = ?', cele: 'FINAL KEY FOUND!', size: 'big',
        vo: 'You are at 15. You will find your key when you add −4 to 15.',
        found: 'Correct! You found it. The explorer reached +11. The key is right here.',
        wrong: [OOPS_KEY, 'Adding a negative changes the direction. The explorer moves left.', 'Start at +15 and count 4 steps to the left.'],
        idle: 'The last key is waiting! Check the sign and follow the explorer.' },
    ],
    mapIntro: [
      { who: 'wizard', text: 'Solve these map puzzles to reveal the next path.' },
    ],
    mysteries: [
      { start: 7, delta: -5, eq: '(+7) + (−5) = ?',
        vo: 'Here’s the first puzzle. You are at 7. You need to add −5 to 7.',
        correct: 'Correct! Part of the path is revealed.',
        wrong: [OOPS_MAP, 'Remember, adding a negative changes the direction.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: -5, delta: -9, eq: '(−5) + (−9) = ?',
        vo: 'Here’s the next puzzle. You are at −5. You need to add −9 to −5.',
        correct: 'Correct! More of the path is revealed.',
        wrong: [OOPS_MAP, 'You’re adding a negative. Think about the direction the explorer would take.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: 12, delta: -14, eq: '(+12) + (−14) = ?',
        vo: 'Here’s the next puzzle. Solve it. You are at 12. You need to add −14 to 12.',
        correct: 'Correct! The path is almost complete.',
        wrong: [OOPS_MAP, 'Adding a negative changes the direction. Think carefully.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: -11, delta: -12, eq: '(−11) + (−12) = ?',
        vo: 'And the last puzzle. You are at −11. You need to add −12 to −11.',
        correct: 'Correct! The path is revealed!',
        wrong: [OOPS_MAP, 'You’re adding a negative. Remember the path changes direction.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
    ],
    hint3: 'tokens',
    unlock: { wizard: 'Hahaha! You solved this level too. The next map piece is here!' },
    revealed: { ost: 'NEXT PATH REVEALED!', wizard: 'Hahaha! You solved all the map puzzles. The next path is open!',
                explorer: 'There it is! Let’s go!', idle: 'Follow the path to the next chamber.' },
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
    badge: { name: 'Flip Master', color: '#14B8A6', dark: '#0F5F57', icon: 'right' },
    rule: [['−(−)', 'Subtract a negative', 'right']],
    teach: [
      { type: 'confused', who: 'explorer', text: 'Oh! These puzzles look different again.', ost: 'The path has changed!' },
      { type: 'wizard', who: 'wizard', text: 'Hahaha! This path has another little twist!' },
      { type: 'flip', from: 'left', to: 'right', who: 'wizard',
        text: 'Subtracting usually takes you to the left. But when you subtract a negative number, you need to change the direction and move to the right.',
        ost: 'Subtract → Move Left<br>Subtract a Negative → Change Direction → Move Right' },
      { type: 'understand', from: 'left', to: 'right', who: 'explorer',
        text: 'Oh! Got it! Subtracting means moving left, but subtracting a negative means changing direction and moving right!',
        ost: 'Subtracting a Negative → Move Right' },
    ],
    keys: [
      { start: -3, delta: 4, eq: '(−3) − (−4) = ?', cele: 'KEY FOUND!', size: 'small',
        vo: 'You are at −3. You will find your key when you subtract −4 from −3.',
        found: 'Correct! You found it. The explorer reached +1. The key is right here.',
        wrong: [OOPS_KEY, 'Remember, subtracting a negative changes the direction. Move right.', 'Start at −3 and count 4 steps to the right.'],
        idle: 'Follow the explorer’s path and find where he reaches.' },
      { start: 6, delta: -5, eq: '(+6) − (5) = ?', cele: '+1 KEY', size: 'small',
        vo: 'You are at 6. You will find your key when you subtract 5 from 6.',
        found: 'Correct! You found it. The explorer reached +1. The key is right here.',
        wrong: [OOPS_KEY, 'This time we’re subtracting a positive number, so move left.', 'Start at +6 and count 5 steps to the left.'],
        idle: 'Check the sign and follow the explorer carefully.' },
      { start: -5, delta: 13, eq: '(−5) − (−13) = ?', cele: 'KEY COLLECTED!', size: 'medium',
        vo: 'You are at −5. You will find your key when you subtract −13 from −5.',
        found: 'Correct! You found it. The explorer reached +8. The key is right here.',
        wrong: [OOPS_KEY, 'Subtracting a negative changes the direction. Move right.', 'Start at −5 and count 13 steps to the right.'],
        idle: 'Watch carefully. The explorer may cross 0.' },
      { start: -11, delta: 6, eq: '(−11) − (−6) = ?', cele: '+1 KEY', size: 'small',
        vo: 'You are at −11. You will find your key when you subtract −6 from −11.',
        found: 'Correct! You found it. The explorer reached −5. The key is right here.',
        wrong: [OOPS_KEY, 'Check the negative number being subtracted. It changes the direction to the right.', 'Start at −11 and count 6 steps to the right.'],
        idle: 'Remember the twist: subtract a negative, then move right.' },
      { start: 15, delta: 4, eq: '(+15) − (−4) = ?', cele: 'FINAL KEY FOUND!', size: 'big',
        vo: 'You are at 15. You will find your key when you subtract −4 from 15.',
        found: 'Correct! You found it. The explorer reached +19. The key is right here.',
        wrong: [OOPS_KEY, 'Subtracting a negative changes the direction. The explorer moves right.', 'Start at +15 and count 4 steps to the right.'],
        idle: 'The last key is waiting! Check the signs and follow the explorer.' },
    ],
    mapIntro: [
      { who: 'wizard', text: 'Solve these map puzzles to reveal the path to the treasure.' },
    ],
    mysteries: [
      { start: 5, delta: 7, eq: '(+5) − (−7) = ?',
        vo: 'Here’s the first puzzle. You are at 5. You need to subtract −7 from 5.',
        correct: 'Correct! Part of the path is revealed.',
        wrong: [OOPS_MAP, 'Remember, subtracting a negative changes the direction. Move right.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: -14, delta: 9, eq: '(−14) − (−9) = ?',
        vo: 'Here’s the second puzzle. You are at −14. You need to subtract −9 from −14.',
        correct: 'Correct! More of the path is revealed.',
        wrong: [OOPS_MAP, 'You’re subtracting a negative. Change direction and move right.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: 11, delta: -14, eq: '(+11) − (14) = ?',
        vo: 'Here’s the next puzzle. You are at 11. You need to subtract 14 from 11.',
        correct: 'Correct! The path is almost complete.',
        wrong: [OOPS_MAP, 'This time you’re subtracting a positive number, so move left.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
      { start: -13, delta: 12, eq: '(−13) − (−12) = ?',
        vo: 'Here’s the last puzzle. You are at −13. You need to subtract −12 from −13.',
        correct: 'Correct! The path is revealed!',
        wrong: [OOPS_MAP, 'Subtracting a negative changes the direction. Move right.', 'Check the mystery from the start.'],
        idle: 'Solve the mystery.' },
    ],
    hint3: 'tokens',
    unlock: { wizard: 'You found all the keys. Here is your last map piece.' },
    revealed: { ost: 'TREASURE PATH REVEALED!', wizard: 'Hahaha! You solved all the puzzles.',
                explorer: 'The treasure path! Let’s go!', idle: 'Follow the path to the treasure.' },
  },
];

// Chamber 2's path reveal: assets/path_reveal_ch2.webp (1435×890), route across the rope bridge (art pixels)
LEVELS[1].pathArt = { img: 'path_reveal_ch2', w: 1435, h: 890, route: [[200, 336], [245, 353], [295, 363], [355, 360], [415, 366], [440, 398], [435, 428], [465, 463], [505, 476], [555, 503], [615, 528], [695, 548], [775, 548], [845, 528], [895, 536], [955, 543], [1025, 553], [1095, 558], [1155, 543], [1190, 513], [1225, 486], [1285, 478], [1345, 476], [1405, 483]] };
// Chamber 3's path reveal: assets/path_reveal_ch3.webp (1427×945), route over the stepping stones to the chest (art pixels)
LEVELS[2].pathArt = { img: 'path_reveal_ch3', w: 1427, h: 945, route: [[46, 473], [96, 479], [156, 491], [216, 509], [286, 525], [356, 519], [426, 513], [476, 501], [506, 468], [551, 448], [601, 458], [631, 485], [676, 478], [726, 493], [771, 518], [821, 531], [871, 541], [901, 538], [946, 515], [996, 503], [1046, 475], [1076, 435], [1096, 398], [1136, 383], [1176, 365], [1206, 335]] };

// default unlock lines; a chamber's own `unlock` overrides any of them
const UNLOCK = {
  wizard: 'You found all the keys! Now unlock the map piece.',
  ost: 'MAP PIECE UNLOCKED!',
  explorer: 'Great! Now I know where to go next!',
  idle: 'Use your keys to unlock the map piece.',
};

const FINAL_BADGE = { name: 'True Treasure Tunnel Explorer', color: '#F5C542', dark: '#9A6B00', icon: 'chest' };

/* QA panel: Q opens it, N auto-solves. Set to false before release to hide it. */
const QA_PANEL = true;

/* Layout editor: E opens it. Edits show in the game while this is true. Set to false before release. */
const EDITOR = true;
