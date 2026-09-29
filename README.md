# Grandad's Cold Snap

The boiler's packed in on the coldest night since 1963, a travelling fair has somehow set up in Grandad's house, and all his cosy things are on the stalls as prizes. Grandad sits in his armchair in the middle of the board, getting colder by the minute. Race round the rooms, win his things back at the fairground games, and get them to him before his temperature drops to 35°C and he gets hypothermia. The colder he gets, the grumpier he gets, and every so often he'll throw his rolled-up newspaper at you.

It's a 3D board game for 1 to 4 players. Everyone's on Grandad's side, but he keeps score of who his favourite is. It runs in the browser, with nothing to install.

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

- **Held upright:** the board fills the top of the screen and big buttons for rolling and choosing a direction sit underneath. **Players**, **Grandad needs** and **The Daily Grumble** pop up as sheets over the board; tap anywhere else to close them.
- **Turned sideways:** the board sits on the left with a slim column of controls on the right. The stalls look best this way round.
- **Touch controls:** tap a flashing square to move, drag the board to look around and pinch to zoom. Every stall has its own touch instructions. For stalls where you aim with your finger (Coconut Shy, Water Pistol Race, Buzz Wire), the aim sits just above your fingertip so your finger doesn't hide the target.

On tablets with a big screen you get the desktop layout, with the same touch controls.

## How to play

1. **Roll the dice**, then choose which way round the house to go: clockwise or anticlockwise. You can click one of the flashing squares on the board, or press <kbd>←</kbd> / <kbd>→</kbd>.
2. **Land in a room that still has its prize** and you play that room's fairground game. Win it and Grandad's thing is yours; it floats above your pawn while you carry it. Lose, and the prize stays on the stall for another try.
3. **Once a room's prize has been won, land there again and you have a rummage.** A mystery parcel floats over its stall to show you can. See below for what you might find.
4. **Pass or stop on a yellow "Pop in to Grandad" door** to hand over everything you're carrying. The camera swoops in to watch Grandad put it on, and he cheers. He warms up a bit, and cools down more slowly from then on. Tap, or press <kbd>Space</kbd>, to skip the cutscene.
5. **When Grandad throws his paper**, press <kbd>Space</kbd> (or tap **Duck!**) while the marker is in the green. If he hits you, you drop one of your prizes (it flies back to its stall), or you miss a go if your hands are empty. He throws more often as he gets colder, and more often still if you hang about in his doorway.
6. **Deliver all 8 things before he cools to 35.0°C**, and set off the fireworks.
7. **Be Grandad's favourite.** He keeps score (see below).

Custard creams let you re-roll after seeing the dice. You start with two and can find more in the Larder and the Sideboard, or by rummaging.

### The fair

Each room has one of Grandad's things as its prize:

| Room | Prize |
| --- | --- |
| Hallway | Slippers |
| Kitchen | Cup of Tea |
| Living Room | Tartan Blanket |
| Conservatory | Woolly Scarf |
| Bathroom | Hot Water Bottle |
| Bedroom | Cardigan |
| Loft | Bobble Hat |
| Garden Shed | Logs for the Fire |

There are 13 stalls. Each game deals 8 of them to the rooms at random, so the house is different every time. Untick **Shuffle the stalls** on the start screen for the classic line-up (the first eight below, in the rooms listed).

| Stall | Classic room | How it works |
| --- | --- | --- |
| Hook-a-Duck | Hallway | Dip the hook (<kbd>Space</kbd>/click) as a duck's ring passes the white circle. Hook 3. |
| Coconut Shy | Kitchen | Aim with the mouse (it wobbles) and click to throw. Knock coconuts off their posts. |
| Tin Can Alley | Living Room | Stop the sweeping line twice, once to set across and once for height, to throw. Clear all 6 cans. |
| Whack-a-Mole | Conservatory | Click the moles or use <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd> / <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>Z</kbd><kbd>X</kbd><kbd>C</kbd>. Don't whack Tiddles the cat. |
| Water Pistol Race | Bathroom | Hold the mouse button (or <kbd>Space</kbd>) to squirt, and keep the jet on the moving clown's mouth. Pop your balloon first. |
| Hoopla | Bedroom | Aim left and right with the mouse, then hold and release to set the throw distance. Ring 2 pegs. |
| Shooting Gallery | Loft | Click to fire corks at the tin ducks. Gold ducks score 2. |
| Test Your Strength | Garden Shed | Swing the hammer (<kbd>Space</kbd>/click) when the power needle is in the red to ring the bell. |
| Dodgems | | Your red car drives towards the mouse (or use the arrow keys). Bump the other cars before time runs out. |
| Candy Floss | | Circle the mouse round the machine (or tap <kbd>←</kbd> <kbd>→</kbd> in turn) at a steady speed to spin a full stick. |
| Duck Derby | | Tap <kbd>Space</kbd>/click in time with the shrinking ring to paddle your duck to the finish first. |
| Buzz Wire | | Carry the loop along the twisty wire with the mouse without setting off the buzzer. |
| Splat the Rat | | A rat drops down the drainpipe when you least expect it. Swing the bat (<kbd>Space</kbd>/click) as it crosses the target. One swing per rat. |

Want a go at the stalls without playing a whole game? The start screen has a **Just want the fairground?** section where you can practise any of them.

### Grandad's favourite

Everyone's trying to save Grandad, but he keeps score of who's his favourite:

| You | Favourite points |
| --- | --- |
| Win a stall | +3 |
| Hand him one of his things | +2 each |
| Duck his newspaper | +1 |
| Get the boiler going, or bring him a warm towel | +1 |
| Get hit by the newspaper | −1 |

With two or more players, whoever's ahead wears a crown on their pawn, and Grandad lets everyone know. Land on the same square as another player who's carrying something and you can **pinch** it: you'll get the points when you hand it over. Grandad might spot you doing it, though, and then he's much more likely to throw his paper at you. At the end he names his favourite.

Playing on your own, your points (plus a rescue bonus if you save him) are a score to beat next time.

### Rummaging

When a room's prize has gone, its squares don't go to waste. Land anywhere in that room and you have a rummage: down the back of the sofa, in the wardrobe, under the doormat, behind the stall. A parcel wobbles, then pops open to show what you found:

| Find | What it does |
| --- | --- |
| Something Grandad lost (the TV remote, his reading glasses, his teeth...) | +1 or +2 favourite points |
| A custard cream | +1 re-roll (or +1 ★ if your pockets are full) |
| Something warm (Nan on the phone, a hot flannel...) | Grandad +0.1°C |
| A lucky charm | The next newspaper he throws at you misses |
| Something that sends him to sleep | He nods off: no newspaper this go |
| The lawnmower (or the postman, or a jack-in-the-box) | You go two more squares on |
| A sock. Just the one. | Nothing at all |
| An icy draught | Grandad −0.1°C |

Every room has its own finds, and you won't get the same thing twice in a row. Tap, or press <kbd>Space</kbd>, to hurry it along.

### Around the board

- **Boiler Cupboard** (start): give it a thump. Half the time it kicks in (+0.3°C).
- **Open Window**: an icy blast (−0.3°C).
- **Stairlift**: ride it all the way down to the Boiler Cupboard.
- **Tiddles' Basket**: trip over the cat and miss a go.
- **Back Door** and **Leaky Window**: draughts (−0.1°C).
- **Airing Cupboard**: a warm towel for Grandad (+0.1°C).

The thermometer in the score pad shows how close Grandad is to hypothermia. It runs from 35°C on the left to 37°C on the right, and the striped red zone at the cold end covers 35.5°C and below. The dashed tip of the column is what he'll lose at the end of this go, and underneath it tells you roughly how many goes are left. When he first slips into the red zone you'll hear his heartbeat, and the thermometer starts to pulse.

As you deliver things, Grandad puts them on in a little cutscene: the hat drops onto his head, the slippers slide onto his feet, the blanket and hot water bottle land on his lap, the scarf and cardigan go on, the tea lands on the side table, and the logs light the fire. A card shows how many of his 8 things he has so far. As he cools down he turns blue, shivers harder, grows an icicle on his nose, the snow gets heavier and frost creeps in round the edges.

### How cold is it?

| Setting | Starts at | What changes |
| --- | --- | --- |
| Mild Autumn | 36.6°C | Slow chill, friendlier stalls, wide ducking window. Good for little ones. |
| Chilly Winter | 36.4°C | The proper game. |
| The Big Freeze | 36.2°C | Fast chill, trickier stalls, tight ducking window. |

With more players each go chills Grandad a little less, so the challenge stays about the same whether you play alone or with the whole family.

### Keys

| Key | Does |
| --- | --- |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Roll the dice, duck, take your go at a stall, or skip a cutscene |
| <kbd>←</kbd> / <kbd>→</kbd> | Go anticlockwise / clockwise |
| <kbd>R</kbd> | Eat a custard cream and re-roll |
| <kbd>Y</kbd> / <kbd>N</kbd> | Pinch another player's prize, or leave it |
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
