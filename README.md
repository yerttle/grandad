# Grandad's Cold Snap

The boiler's packed in on the coldest night since 1963, a travelling fair has somehow set up in Grandad's house, and all his cosy things are on the stalls as prizes. Grandad sits in his armchair in the middle of the board, getting colder by the minute. Race round the rooms, win his things back at the fairground games, and get them to him before his temperature drops to 35°C and he gets hypothermia. The colder he gets, the grumpier he gets, and every so often he'll throw his rolled-up newspaper at you.

It's a 3D board game for 1 to 4 players (everyone's on Grandad's side). It runs in the browser, with nothing to install.

## Playing on your Mac

**Quickest:** double-click `index.html`. It opens in Safari (or your default browser) and you're playing.

**As a proper app:** in Terminal, from this folder, run

```bash
./make-mac-app.sh
```

That puts **Grandad's Cold Snap** in `~/Applications`. Double-click it, or drag it to your Dock. It opens the game in its own window using Chrome, Edge or Brave if you have one of them, and in Safari otherwise.

The game works offline: it carries its own copy of the 3D library (`vendor/three.min.js`). With an internet connection it also downloads its retro fonts; without one it uses fonts your Mac already has.

The original flat 2D version is still here as `classic.html`, if you want it.

## How to play

1. **Roll the dice**, then choose which way round the house to go: clockwise or anticlockwise. You can click one of the flashing squares on the board, or press <kbd>←</kbd> / <kbd>→</kbd>.
2. **Land in a room that still has its prize** and you play that room's fairground game. Win it and Grandad's thing is yours; it floats above your pawn while you carry it. Lose, and the prize stays on the stall for another try.
3. **Pass or stop on a yellow "Pop in to Grandad" door** to hand over everything you're carrying. Grandad puts it on, warms up a bit, and cools down more slowly from then on.
4. **When Grandad throws his paper**, press <kbd>Space</kbd> (or tap **Duck!**) while the marker is in the green. If he hits you, you drop one of your prizes (it flies back to its stall), or you miss a go if your hands are empty. He throws more often as he gets colder, and more often still if you hang about in his doorway.
5. **Deliver all 8 things before he cools to 35.0°C.**

Custard creams let you re-roll after seeing the dice. You start with two and can find more in the Larder and the Sideboard.

### The fair

| Room | Stall | Prize | How it works |
| --- | --- | --- | --- |
| Hallway | Hook-a-Duck | Slippers | Dip the hook (<kbd>Space</kbd>/click) as a duck's ring passes the white circle. Hook 3. |
| Kitchen | Coconut Shy | Cup of Tea | Aim with the mouse (it wobbles) and click to throw. Knock coconuts off their posts. |
| Living Room | Tin Can Alley | Tartan Blanket | Stop the sweeping line twice, once to set across and once for height, to throw. Clear all 6 cans. |
| Conservatory | Whack-a-Mole | Woolly Scarf | Click the moles or use <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd> / <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>Z</kbd><kbd>X</kbd><kbd>C</kbd>. Don't whack Tiddles the cat. |
| Bathroom | Water Pistol Race | Hot Water Bottle | Hold the mouse button (or <kbd>Space</kbd>) to squirt, and keep the jet on the moving clown's mouth. Pop your balloon first. |
| Bedroom | Hoopla | Cardigan | Aim left and right with the mouse, then hold and release to set the throw distance. Ring 2 pegs. |
| Loft | Shooting Gallery | Bobble Hat | Click to fire corks at the tin ducks. Gold ducks score 2. |
| Garden Shed | Test Your Strength | Logs for the Fire | Swing the hammer (<kbd>Space</kbd>/click) when the power needle is in the red to ring the bell. |

Want a go at the stalls without playing a whole game? The start screen has a **Just want the fairground?** section where you can practise any of them.

### Around the board

- **Boiler Cupboard** (start): give it a thump. Half the time it kicks in (+0.3°C).
- **Open Window**: an icy blast (−0.3°C).
- **Stairlift**: ride it all the way down to the Boiler Cupboard.
- **Tiddles' Basket**: trip over the cat and miss a go.
- **Back Door** and **Leaky Window**: draughts (−0.1°C).
- **Airing Cupboard**: a warm towel for Grandad (+0.1°C).

As you deliver things, Grandad puts them on: slippers on his feet, the blanket and hot water bottle on his lap, the hat, scarf and cardigan, a cup of tea on the side table, and the logs light the fire. As he cools down he turns blue, shivers harder, grows an icicle on his nose, the snow gets heavier and frost creeps in round the edges.

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
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Roll the dice, duck, or take your go at a stall |
| <kbd>←</kbd> / <kbd>→</kbd> | Go anticlockwise / clockwise |
| <kbd>R</kbd> | Eat a custard cream and re-roll |
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
| `js/minigames.js` | The eight fairground games |
| `js/game.js` | Turns, the score pad and the start and end screens |
| `vendor/three.min.js` | three.js r128 (MIT licence, see `vendor/three-LICENSE.txt`) for offline play |
| `classic.html` | The original 2D version |
| `make-mac-app.sh` | Wraps the game as a Mac app |
