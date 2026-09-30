# Grandad's Cold Snap

The boiler's packed in on the coldest night since 1963, a travelling fair has somehow set up in Grandad's house, and it's selling all his cosy things at the Fair Shop. Grandad sits in his armchair in the middle of the board, getting colder by the minute. Race round the rooms winning tokens at the fairground games, and buy him his things back before his temperature drops to 35°C and he gets hypothermia. The colder he gets, the grumpier he gets, and every so often he'll throw his rolled-up newspaper at you.

It's a 3D board game for 1 to 4 players, all on Grandad's side. It runs in the browser, with nothing to install.

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

1. **Pick how many things Grandad needs** on the start screen: 3 for a quick game, 6 for a standard one, 9, or 12 for a marathon.
2. **Roll the dice.** Everyone moves clockwise round the house. The score pad tells you where you'll land and what's there, and your pawn sets off by itself a moment later (press <kbd>Space</kbd> to hurry it along).
3. **Land on a fairground stall** (a gold token spins above each one) and play for **tokens**: up to 3 each time, depending on how well you do. When a stall pays out, it packs up and a different game from the fair takes its place, so you won't keep playing the same one.
4. **Go to the Fair Shop.** At the end of your go, if you've got 3 tokens, you're taken to the Fair Shop to buy Grandad something. Everything costs 3 tokens, and each thing warms him up and makes him cool more slowly from then on. The camera swoops in to watch him put it on. Buy the number of things you picked at the start and he's saved. You can also save your tokens for later.
5. **Every other square wins or loses you tokens**, and each one pops up a card saying exactly what happened (see "Around the board" below). The card stays up until you press **OK** (or <kbd>Space</kbd>).
6. **Watch the thermometer.** Grandad cools a little at the end of every go, and the only things that warm him up are the things you buy him. Keep him out of the red zone and above 35.0°C.
7. **When Grandad throws his paper**, press <kbd>Space</kbd> (or tap **Duck!**) while the marker is in the green. If he hits you, you drop tokens, or you miss a go if you've none. He throws more often as he gets colder, and more often still if you hang about in his doorway.
8. **Playing together?** You're all on the same side. But land on another player's square and you can pinch a token (see below).

### The Fair Shop

There are 12 things to buy, all for 3 tokens each:

| Thing | Warms him | He cools this much slower |
| --- | --- | --- |
| Slippers | +0.3°C | 10% |
| Cup of Tea | +0.7°C | 8% |
| Tartan Blanket | +0.3°C | 14% |
| Woolly Scarf | +0.3°C | 10% |
| Hot Water Bottle | +0.6°C | 12% |
| Cardigan | +0.3°C | 12% |
| Bobble Hat | +0.3°C | 10% |
| Logs for the Fire | +0.6°C | 14% |
| Woolly Mittens | +0.3°C | 8% |
| Earmuffs | +0.3°C | 8% |
| Bowl of Soup | +0.6°C | 5% |
| Electric Heater | +0.5°C | 14% |

Tea and soup give him the biggest warm-up straight away. The blanket, the logs and the heater slow his cooling the most, which pays off over a long game.

### The fair

There are 13 games and 10 stall squares: the middle square of every room, plus the Larder in the Kitchen and the Sideboard in the Living Room. Each game deals 10 of the games onto the board at random, and the other 3 wait in reserve. Whenever a stall pays out tokens, it packs up and one from the reserve pops up in its place. Untick **Shuffle the stalls** on the start screen for the classic starting line-up (the squares listed below).

Every stall pays up to 3 tokens. On the harder settings you need to do more to earn each token. On Dodgems, for example, each token takes 1 bump on Mild, 2 on Chilly and 4 on the Big Freeze.

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

Everyone's on the same side: you win or lose together. Land on the same square as another player who has tokens, though, and you can **pinch** one. Grandad might spot you doing it, and then he's much more likely to throw his paper at you. At the end you'll see how many tokens each of you won and how many things you each bought him.

Playing on your own, the end screen shows how many goes it took to save Grandad, and your record for that setting and number of things, so you can try to do it faster.

### The thermometer

The thermometer in the score pad shows how close Grandad is to hypothermia. It runs from 35°C on the left to 37°C on the right, and the striped red zone at the cold end covers 35.5°C and below. He cools a little at the end of every go, whatever square you land on. The dashed tip of the column shows how much, the thermometer says so as it happens, and underneath it tells you roughly how many goes are left. When he first slips into the red zone you'll hear his heartbeat, and the thermometer starts to pulse.

Everything you buy him goes on in a little cutscene: the hat drops onto his head, the slippers slide onto his feet, the mittens go on his hands, the earmuffs over his ears, the blanket and hot water bottle land on his lap, the scarf and cardigan go on, the tea and the soup land on the side table, the logs light the fire and the heater switches on. A card shows how many of the things he needs he has so far. As he cools down he turns blue, shivers harder, grows an icicle on his nose, the snow gets heavier and frost creeps in round the edges.

### How cold is it?

| Setting | Starts at | Cools each go | What else changes |
| --- | --- | --- | --- |
| Mild Autumn | 36.6°C | 0.12°C | Friendlier stalls, small token losses, wide ducking window. Good for little ones. |
| Chilly Winter | 36.4°C | 0.18°C | The proper game. |
| The Big Freeze | 36.2°C | 0.19°C | Stalls need more for each token, bigger token losses, tight ducking window. |

Every thing you buy slows his cooling a little more. With more players each go chills Grandad a little less, so the challenge stays about the same whether you play alone or with the whole family. In simulated games, a steady player wins Chilly Winter about 9 times in 10 and the Big Freeze about 6 times in 10, whichever number of things you pick. Picking more things makes a longer game: roughly 10 goes for 3 things, 19 for 6, 28 for 9 and 37 for 12.

### Keys

| Key | Does |
| --- | --- |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Roll the dice (and hurry your pawn along), duck, take your go at a stall, close a card, or skip a cutscene |
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
