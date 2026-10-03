# Ideas to make Grandad's Cold Snap more fun

A running list of things we could add. Each one has a status so we can see what's done.

| Status | Meaning |
| --- | --- |
| **Built** | In the game now |
| **Idea** | Not started yet |
| **Removed** | Tried, then taken out |

## Top three

### 1. Put your real Grandad in it — Idea

Upload a photo and his face goes onto the 3D Grandad's head. Type in his real name and a few of the things he always says, and they turn up in his speech bubbles.

His lines could also be read aloud in a grumpy British voice, using one of the voices built into the Mac (for example "Daniel"). That costs nothing and works offline.

A family game about your own Grandad will get far more laughs than a generic one.

### 2. Fairground tickets and a prize booth — Built (as tokens and the Fair Shop)

At the moment you either win a stall's prize or get nothing. Instead, every stall pays out tickets however well you do, and you spend them at a prize booth on treats:

- **Earmuffs:** block the next newspaper throw.
- **Roller skates:** add 2 to a roll.
- **Hot toddy:** warm Grandad up straight away.

That gives you choices on every go, and a bad stall still leaves you with something.

### 3. Daily Grumble headline cards — Idea

A few squares draw a newspaper headline that shakes things up:

- **"POWER CUT":** every stall is shut for a round.
- **"NAN RINGS":** everyone gets a token.
- **"GRANDAD NODS OFF":** no newspaper for two goes.
- **"TIDDLES STEALS A PRIZE":** the cat runs off with one and you chase her.
- **"BLIZZARD":** the countdown loses an extra round.

These fit the newspaper theme and make each game play differently.

## More ideas

### Rivalry: Grandad's favourite grandchild — Removed

Favourite points for winning stalls, buying things and ducking his paper, with a crown for the leader and Grandad naming his favourite at the end. In play they didn't add anything, so they've gone. Pinching a token off another player by landing on their square is still in. The end screen now shows what each player won and bought, and on your own it shows how many goes the rescue took, with a record to beat.

### Custard creams — Removed

You started with two custard creams and could eat one to re-roll. It didn't feel like a real choice, so they've gone too. (Back then no number was better than any other, so a re-roll meant nothing. Now that the stalls have prizes to aim for, re-rolling is back as the lucky dice.) The Larder and the Sideboard, which used to give custard creams, are now stalls, and everyone simply rolls and moves clockwise.

### Co-op and Versus — Built

With two or more players you choose on the start screen. **Co-op:** you fill one list for Grandad between you and win or lose together. **Versus:** everyone races to buy their own full set, and the first to finish wins. The Fair Shop shows what's in your set and who else has bought what. If the rounds run out first, nobody wins, and the end screen shows who got closest.

### A fixed number of rounds — Built

The cooling maths (a different drop every go, items that warmed him and slowed his cooling) was hard to follow, so it's gone. You now get a fixed number of rounds, shown as "Round 3 of 14", and the thermometer just counts them down. How many rounds depends on the mode, the number of players and the number of things. The limits come from simulated games, so a steady player gets there about 9 times in 10 on Chilly Winter.

### Head-to-head stalls — Idea

In a game with several players, another player can challenge you at a stall, for example a two-player Water Pistol Race. Whoever wins takes the prize.

### More stalls, shuffled — Built

Five new stalls:

- **Dodgems:** bump the other cars.
- **Candy Floss:** spin the floss at a steady speed.
- **Duck Derby:** paddle your duck to the finish.
- **Buzz Wire:** steady hand, don't touch the wire.
- **Splat the Rat:** whack the rat as it shoots out of the drainpipe.

That makes 13 stalls in all. Each game deals 8 of them to the rooms at random, so the house is different every time. There's an option on the start screen to keep the original line-up.

### Delivery cutscenes — Built

Handing Grandad one of his things is now the big moment of the game. The screen goes letterbox and the camera swoops in on his chair. The item floats over trailing sparkles and puts itself on him: the hat drops onto his head, the slippers slide onto his feet, the blanket unrolls over his knees, the tea lands on the side table, and the logs fly into the grate and the fire roars. Grandad cheers in his chair, confetti pops from the arms of the chair and a brass fanfare plays. A card then shows what you've collected so far, with a new line at the first, the halfway point and the last one.

The last delivery sets off a fireworks finale: rockets over the house, confetti raining down, Grandad thawing out and waving his paper, and everyone's pawns jumping for joy.

Winning a stall now fires confetti cannons too. Every cutscene can be skipped with a tap, <kbd>Space</kbd> or <kbd>Enter</kbd>.

### Rummaging — Built

Once a room's prize has been won, its squares used to do nothing, so the end of a game went flat. Now a mystery parcel floats over the stall, and landing anywhere in that room means a rummage. Every room has its own finds: the TV remote down the back of the sofa, Nan ringing on the telephone table, moth balls in the wardrobe that send Grandad off to sleep, a lawnmower that chases you two squares on, and a single sock. Finds give tokens (Grandad pays you for finding his lost things), a lucky charm that stops the next newspaper, forty winks, or nothing at all, with the odd lost token.

### Tokens and the Fair Shop — Built

The stalls now pay out fairground tokens instead of one fixed prize: up to 3 a go, depending on how well you do. On harder settings each token takes more (on Dodgems it's 1 bump per token on Mild, 2 on Chilly and 4 on the Big Freeze). At the end of your go, 3 tokens buys Grandad something at the Fair Shop, which now has 12 things, including new mittens, earmuffs, a bowl of soup and an electric heater. Every other square is a clear token swing: the doors, the boiler and the airing cupboard pay a token, and the open window, draughts and Tiddles cost tokens, more on harder settings. You pick how many things he needs (3, 6, 9 or 12), which sets how long the game lasts. Everyone goes clockwise round the house, and walking past the Boiler Cupboard (START) pays a token, like passing Go.

### Prizes on the stalls, roller skates and lucky dice — Built

Rolling the dice felt pointless: every stall paid the same and everything cost the same at one shop, so where you landed hardly mattered. Now every stall has one of Grandad's things spinning over it as its top prize. Before you roll, the board shows which numbers land on one ("Roll a 2 for the Slippers or a 5 for the Tea"). Light up all 3 tokens at that stall and the prize flies straight to Grandad; light fewer and you keep the tokens, and the prize stays up for the next go. In Versus that makes a race for it: "She missed! The slippers are still there, I need a 3!"

The Fair Shop is still there as the slow, safe route, but things now cost 4 tokens, so winning at the stall is the shortcut. A stall only packs up when its prize is won, so after a miss the next player knows what they're facing. The round limits were re-run through a simulation, now kept in `tools/simulate.js`.

Roller skates (one square on or one short, to land on a prize) and the lucky dice (roll again) first went in as things you paid for on the spot, straight after a roll. That made it too easy, so now you buy them at the Fair Shop at the end of your go and carry them (one of each) for a later go. If you're not carrying them, you don't get offered them. Each one costs you a token more than your last (1, 2, 3...). In the simulation they roughly pay for themselves at 1 or 2 tokens and cost you at 3 or more, so they're a real choice rather than a shortcut.

### Grandad's errands — Idea

Every few turns Grandad asks for something: "Fetch me reading glasses from the Chest of Drawers!" That square lights up, and whoever gets there first earns a bonus and a mini-cutscene of him putting them on. It gives you a reason to aim for particular squares, and players race each other for it.

### Surprise parcels — Idea

Each round a glowing gift box drops onto a random empty square where everyone can see it. Land on it to open it.

### Tiddles roams — Idea

The cat wanders onto a new square each round. Land on her and she either purrs on Grandad's lap (+1 token) or scratches you (drop a token).

### Stalls swap when they pay out — Built

There are 13 games and 10 stall squares, so 3 games wait in reserve. When a stall pays out tokens, it squashes down into the board and one from the reserve pops up in its place, with its name on the square. You keep meeting different games instead of playing the same one over and over.

### A grand finale — Idea

Once all 8 things are delivered, there's one last challenge. For example, carry a full cup of tea to Grandad without spilling it while he flaps his paper about.

### Grandad moves — Idea

When he gets very cold he climbs out of his chair and chases you round the board on the stairlift.

### A livelier Grandad — Idea

More reactions:

- shaking his fist
- a little happy dance when he's warm
- nodding off and snoring
- peering over his glasses when you're near

### Characters — Idea

Choose your pawn from the grandkids, the dog, Tiddles or Nan. Each has a small special ability, such as:

- Nan starts with an extra token.
- The dog moves one extra square.

### High scores — Idea

Fastest rescue and best score at each stall, kept in one leaderboard that the whole family shares across devices.

### Little ones' mode — Idea

No losing, bigger targets, slower stalls, and every stall pays out. Grandad still grumbles, of course.
