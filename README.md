# Grandad's Cold Snap

The boiler's packed in on the coldest night since 1963, a travelling fair has somehow set up in Grandad's house, and it's hung all his cosy things up as prizes. Grandad sits in his armchair in the middle of the board, getting colder by the minute. Race round the rooms winning his things back at the fairground games (or winning tokens and buying them at the Fair Shop) before the rounds run out and he gets hypothermia. The colder he gets, the grumpier he gets, and every so often he'll throw his rolled-up newspaper at you.

It's a 3D board game for 1 to 4 players: play together to save Grandad (Co-op), or race each other to be the first to buy him a full set (Versus). It runs in the browser, with nothing to install.

## Playing on your Mac

**Quickest:** double-click `index.html`. It opens in Safari (or your default browser) and you're playing.

**As a proper app:** in Terminal, from this folder, run

```bash
./make-mac-app.sh
```

That puts **Grandad's Cold Snap** in `~/Applications`. Double-click it, or drag it to your Dock. It opens the game in its own window using Chrome, Edge or Brave if you have one of them, and in Safari otherwise.

The game works offline: it carries its own copy of the 3D library (`vendor/three.min.js`). With an internet connection it also downloads its retro fonts; without one it uses fonts your Mac already has.

The original flat 2D version is still here as `classic.html`, if you want it.

## Playing on a phone or tablet

Open the game's link (or `index.html`) on your phone and it switches to a touch layout automatically:

- **Held upright:** the board fills the top of the screen and big buttons for rolling and moving sit underneath. **Players**, **Grandad needs** and **The Daily Grumble** pop up as sheets over the board; tap anywhere else to close them.
- **Turned sideways:** the board sits on the left with a slim column of controls on the right. The stalls look best this way round.
- **Touch controls:** tap **Roll the dice** to take your go, drag the board to look around and pinch to zoom. Every stall has its own touch instructions. For stalls where you aim with your finger (Coconut Shy, Water Pistol Race, Buzz Wire), the aim sits just above your fingertip so your finger doesn't hide the target.

On tablets with a big screen you get the desktop layout, with the same touch controls.

## How to play

1. **Pick how many things Grandad needs** on the start screen: 3 for a quick game, 6 for a standard one, 9, or 12 for a marathon. With two or more players, also pick **Co-op** or **Versus**.
2. **Look at what's up for grabs.** Every fairground stall has one of Grandad's things spinning over it as its **top prize**. Before you roll, gold markers on the board show which numbers land on one, and the score pad spells it out: "Roll a 2 for the Slippers or a 5 for the Cup of Tea."
3. **Roll the dice.** Everyone moves clockwise round the house. The score pad tells you where you'll land and what's there, and your pawn sets off by itself a moment later (press <kbd>Space</kbd> to hurry it along). Just missed a prize? You can pay a token on the spot for **roller skates** or the **lucky dice** (see below).
4. **Win the prize.** At a stall, light up all 3 tokens and you win its prize: it flies straight off the stall to Grandad, the camera swoops in to watch him put it on, and the stall packs up for a different game with a new prize. Light up fewer and you keep the tokens instead, and the prize stays up for the next go.
5. **Or go to the Fair Shop.** At the end of your go, if you've got 4 tokens, you're taken to the Fair Shop to buy Grandad something. Everything costs 4 tokens. You can also save your tokens for later. Get him the number of things you picked at the start and he's saved.
6. **Every other square wins or loses you tokens**, and each one pops up a card saying exactly what happened (see "Around the board" below). The card stays up until you press **OK** (or <kbd>Space</kbd>).
7. **Watch the rounds.** You get a fixed number of rounds (a round is everyone having one go). The thermometer counts them down, a notch at the end of every round. Get everything before it runs out, or Grandad gets hypothermia.
8. **When Grandad throws his paper**, press <kbd>Space</kbd> (or tap **Duck!**) while the marker is in the green. If he hits you, you drop tokens, or you miss a go if you've none. He throws more often as he gets colder, and more often still if you hang about in his doorway.
9. **Playing together?** In Co-op you fill one list between you. In Versus you each need your own full set, and the first to get one wins (see below).

### Roller skates and the lucky dice

Straight after you roll, if you haven't landed on a prize you need and you've got a token, the score pad can offer you an extra, paid for on the spot:

- **Roller skates** (1 token): go one square further, or stop one square short. They're only offered when that lands you on a prize you need, and the square they'd take you to lights up green on the board (you can tap it).
- **Lucky dice** (1 token): roll again. Once a go, and only when there's a prize you need somewhere within reach. If the new roll just misses too, you can still use the skates.

Or say **No thanks** (<kbd>Space</kbd>) and off you go. With nothing worth offering, your pawn just sets off as normal.

### The Fair Shop

There are 12 of Grandad's things: slippers, a cup of tea, a tartan blanket, a woolly scarf, a hot water bottle, his cardigan, a bobble hat, logs for the fire, woolly mittens, earmuffs, a bowl of soup and an electric heater. They all count the same. Up to 10 of them hang on the stalls as top prizes at any one time, and the Fair Shop sells every one of them for 4 tokens. The Fair Shop card in the score pad says which stall each thing is hanging on.

Only things somebody still needs go up as prizes. Once Grandad's got something (bought or won), it comes down off its stall and something else goes up. Late in a long game there can be more stalls than things left to win, and a stall with no prize goes back to a gold token and pays up to 3 tokens.

### The fair

There are 13 games and 10 stall squares: the middle square of every room, plus the Larder in the Kitchen and the Sideboard in the Living Room. Each game deals 10 of the games onto the board at random, and the other 3 wait in reserve. Whenever a stall's prize is won, it packs up and one from the reserve pops up in its place, with a new prize. While its prize is still up it stays put, so the next player knows what they're up against. Untick **Shuffle the stalls** on the start screen for the classic starting line-up (the squares listed below).

Every stall has 3 tokens to light up. Light all 3 to win the prize hanging on it; light fewer and you keep that many tokens. On the harder settings you need to do more to light each one. On Dodgems, for example, each token takes 1 bump on Mild, 2 on Chilly and 4 on the Big Freeze.

| Stall | Classic square | How it works | Tokens (Mild / Chilly / Big Freeze) |
| --- | --- | --- | --- |
| Hook-a-Duck | Hallway | Dip the hook (<kbd>Space</kbd>/click) as a duck's ring passes the white circle. | A token for every 1 / 2 / 3 ducks |
| Coconut Shy | Kitchen | Aim with the mouse (it wobbles) and click to throw. A fresh coconut goes up when one falls. | Every 1 / 2 / 2 coconuts |
| Tin Can Alley | Living Room | Stop the sweeping line twice, once to set across and once for height, to throw. | Every 1 / 2 / 2 cans |
| Whack-a-Mole | Conservatory | Click the moles or use <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd> / <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>Z</kbd><kbd>X</kbd><kbd>C</kbd>. Don't whack Tiddles the cat. | Every 3 / 4 / 4 moles |
| Water Pistol Race | Bathroom | Hold the mouse button (or <kbd>Space</kbd>) to squirt, and keep the jet on the moving clown's mouth. | 3 for popping your balloon first, otherwise one for each third you filled |
| Hoopla | Bedroom | Aim left and right with the mouse, then hold: a target slides across the table showing where your ring will land. Let go when it lights up over a peg. 6 / 5 / 5 rings. | Every ring over a peg |
| Shooting Gallery | Loft | Click to fire corks at the tin ducks. Gold ducks score 2. | Every 2 / 3 / 4 points |
| Test Your Strength | Garden Shed | Swing the hammer (<kbd>Space</kbd>/click) when the power needle is in the red to ring the bell. | Every ring of the bell |
| Dodgems | | Your red car drives towards the mouse (or use the arrow keys). Bump the other cars before time runs out. | Every 1 / 2 / 4 bumps |
| Candy Floss | Kitchen (the Larder) | Circle the mouse round the machine (or tap <kbd>←</kbd> <kbd>→</kbd> in turn) at a steady speed. | One for each third of a stick |
| Duck Derby | | Tap <kbd>Space</kbd>/click in time with the shrinking ring to paddle your duck to the finish. | 3 for 1st, 2 for 2nd, 1 for 3rd |
| Buzz Wire | | Carry the loop along the twisty wire with the mouse without setting off the buzzer. | One for each third of the way, 3 for reaching the end |
| Splat the Rat | Living Room (the Sideboard) | A rat drops down the drainpipe when you least expect it. Swing the bat (<kbd>Space</kbd>/click) as it crosses the target. One swing per rat. | Every 1 / 1 / 2 rats |

Want a go at the stalls without playing a whole game? The start screen has a **Just want the fairground?** section where you can practise any of them.

### Around the board

Every square does something you can see, and each one pops up a card saying what happened. Good squares always pay a token. Bad ones cost more on the harder settings.

| Square | What happens | Mild / Chilly / Big Freeze |
| --- | --- | --- |
| Pop in to Grandad (the yellow doors) | He slips you a token from his cardigan pocket, but he's grumpier with you hanging about | +1 token |
| Boiler Cupboard (start) | Give it a thump and a token rattles out. Walk past it on your way round the house and you get a token too | +1 token |
| Stairlift | Ride it down to the Boiler Cupboard, then thump the boiler | +1 token |
| Airing Cupboard | Fold the warm towels and Grandad gives you a token | +1 token |
| Open Window | An icy blast whips tokens out of your hand | −1 / −2 / −3 tokens |
| Back Door and Leaky Window | Draughts | −1 / −1 / −2 tokens |
| Tiddles' Basket | Tiddles pinches your tokens | −1 / −2 / −2 tokens |
| Magnifying-glass squares | A rummage (see below) | |

You can never lose more tokens than you've got.

### Rummaging

The plain squares in each room are for rummaging: down the back of the sofa, in the wardrobe, under the doormat. A parcel wobbles, then pops open to show what you found:

| Find | What it does |
| --- | --- |
| A token (in the sofa, in the soap dish, from Nan...) | +1 token |
| Something Grandad lost (the TV remote, his reading glasses...) | He gives you a token for finding it |
| Something he's really missed (his teeth, his wedding suit, his bowls trophy) | +2 tokens |
| A lucky charm | The next newspaper he throws at you misses (if you've already got one, +1 token instead) |
| Something that sends him to sleep | He nods off: no newspaper this go |
| The lawnmower (or the postman, or a jack-in-the-box) | You go two more squares on |
| A sock. Just the one. | Nothing at all |
| A hole in your pocket, a moth, the plughole... | −1 token (−2 on the Big Freeze) |

Every room has its own finds, and you won't get the same thing twice in a row. Tap, or press <kbd>Space</kbd>, to hurry it along.

### Playing together

With two or more players you pick how to play on the start screen:

- **Co-op:** you're all on the same side and fill one list for Grandad between you. You win or lose together. At the end you'll see how many prizes and tokens each of you won and how many things you each got him.
- **Versus:** you each need your own full set of the number of things you picked, and the first to get one wins. Race each other to the prizes: miss one and it's still there for the next player. A prize you've already got in your set pays up to 3 tokens instead. The Fair Shop shows what's already in your set and who else has bought what. Grandad wears everything anyone wins or buys him. If the rounds run out before anyone finishes, Grandad gets hypothermia and nobody wins, though the end screen shows who got closest.

In either mode, land on the same square as another player who has tokens and you can **pinch** one. Grandad might spot you doing it, and then he's much more likely to throw his paper at you.

Playing on your own, the end screen shows how many goes it took to save Grandad, and your record for that setting and number of things, so you can try to do it faster.

### The thermometer

The thermometer in the score pad is a countdown. It starts full and drops a notch at the end of every round, and it's empty when the rounds run out. "Round 3 of 14" and the number of rounds left are shown above it, so there's nothing to work out. The dashed notch at the tip is the round you're in. The striped red zone is the last quarter of the rounds: when you reach it you'll hear his heartbeat, and the thermometer starts to pulse. Buying things doesn't change the countdown. It's just a race to get everything before time's up.

How many rounds you get depends on the mode, the number of players and the number of things. The start screen tells you before you begin.

When you win, you get stars for the rounds you had to spare: 1 star for winning at all, 2 for finishing with about an eighth of the rounds left, and 3 for about a third. The end screen tells you exactly how many rounds the next star needed.

| Things | Solo | Co-op, 2 / 3 / 4 players | Versus, 2 / 3 / 4 players |
| --- | --- | --- | --- |
| 3 | 15 | 8 / 6 / 5 | 11 / 10 / 10 |
| 6 | 27 | 14 / 10 / 8 | 23 / 21 / 20 |
| 9 | 40 | 21 / 14 / 11 | 34 / 32 / 31 |
| 12 | 53 | 27 / 19 / 15 | 47 / 44 / 42 |

Everything you win or buy him goes on in a little cutscene: the hat drops onto his head, the slippers slide onto his feet, the mittens go on his hands, the earmuffs over his ears, the blanket and hot water bottle land on his lap, the scarf and cardigan go on, the tea and the soup land on the side table, the logs light the fire and the heater switches on. A card shows how many of the things he needs he has so far (in Versus, how many are in your set). As the rounds run down he turns blue, shivers harder, grows an icicle on his nose, the snow gets heavier and frost creeps in round the edges.

### How cold is it?

| Setting | What changes |
| --- | --- |
| Mild Autumn | Friendlier stalls, small token losses, wide ducking window. Good for little ones. |
| Chilly Winter | The proper game. |
| The Big Freeze | Stalls need more for each token, bigger token losses, tight ducking window. |

You get the same number of rounds on every setting. The harder settings are harder because a full score at a stall is harder to get, the stalls pay out less and the bad squares cost more. The round limits come from simulated games (`tools/simulate.js`): a steady player gets there about 9 times in 10 on Chilly Winter, nearly always on Mild Autumn and about 4 times in 10 on the Big Freeze. In Versus, someone finishes about 9 times in 10 on Chilly Winter.

### Keys

| Key | Does |
| --- | --- |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Roll the dice (and hurry your pawn along), say no thanks to the skates and lucky dice, duck, take your go at a stall, close a card, or skip a cutscene |
| <kbd>→</kbd> / <kbd>←</kbd> | Roller skates: one square on, or stop one short |
| <kbd>R</kbd> | Lucky dice: roll again |
| <kbd>1</kbd>–<kbd>9</kbd> | Buy something at the Fair Shop |
| <kbd>Esc</kbd> | Leave the Fair Shop and save your tokens |
| <kbd>Y</kbd> / <kbd>N</kbd> | Pinch another player's token, or leave it |
| <kbd>M</kbd> | Sound on or off |
| Drag / scroll | Look around the board / zoom |

All the sound effects and the fairground organ music are generated live in the browser, so there are no audio files. Everything you see is built from simple 3D shapes in code: there are no image or model files either.

## What's in the folder

| File | What it is |
| --- | --- |
| `index.html` | The game page and its styles |
| `js/core.js` | Rules, sounds and music, board layout |
| `js/art.js` | Textures and 3D models (Grandad, his chair, the stalls, the prizes) |
| `js/engine.js` | Rendering, animation and the camera |
| `js/board.js` | The 3D board and everything that moves on it |
| `js/minigames.js` | The 13 fairground games |
| `js/game.js` | Turns, the score pad and the start and end screens |
| `vendor/three.min.js` | three.js r128 (MIT licence, see `vendor/three-LICENSE.txt`) for offline play |
| `classic.html` | The original 2D version |
| `make-mac-app.sh` | Wraps the game as a Mac app |
| `docs/ideas.md` | Ideas for making it even more fun, and which ones are built |
| `tools/simulate.js` | Simulates thousands of games to set the round limits (`node tools/simulate.js`) |
