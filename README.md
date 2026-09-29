# Grandad's Cold Snap

The boiler's packed in on the coldest night since 1963, and Grandad won't budge from his armchair in the middle of the board. Race round the house, room by room, and fetch his cosy things before his temperature drops to 35°C and he gets hypothermia. The colder he gets, the grumpier he gets, and every so often he'll swing his rolled-up newspaper at you.

It's a board game for 1 to 4 players (everyone's on Grandad's side), in a single `index.html` file with no installs.

## Playing on your Mac

**Quickest:** double-click `index.html`. It opens in Safari (or your default browser) and you're playing.

**As a proper app:** in Terminal, from this folder, run

```bash
./make-mac-app.sh
```

That puts **Grandad's Cold Snap** in `~/Applications`. Double-click it, or drag it to your Dock. It opens the game in its own window using Chrome, Edge or Brave if you have one of them, and in Safari otherwise.

The game works offline. With an internet connection it also downloads its retro fonts; without one it falls back to fonts your Mac already has.

## How to play

1. **Roll the dice**, then choose which way round the house to go: clockwise or anticlockwise.
2. **Land exactly** on one of Grandad's things to pick it up. Each room has one thing, somewhere on one of its three squares.
3. **Pass or stop on a yellow "Pop in to Grandad" door** to hand over everything you're carrying. Each thing warms him up a bit and slows how fast he cools down.
4. **When Grandad swings his paper**, press <kbd>Space</kbd> (or tap **Duck!**) while the marker is in the green. If he hits you, you drop one of the things you're carrying (it lands back in its room), or you miss a go if your hands are empty. He swings more often as he gets colder, and more often still if you hang about in his doorway.
5. **Deliver all 8 things before he cools to 35.0°C.**

Custard creams let you re-roll after seeing the dice. You start with two and can find more in the Larder and the Sideboard.

### The house

| Room | What's hidden there | Watch out for |
| --- | --- | --- |
| Hallway | Slippers | |
| Kitchen | Cup of Tea | Back Door draught (−0.1°C), custard creams in the Larder |
| Living Room | Tartan Blanket | Custard creams in the Sideboard |
| Conservatory | Woolly Scarf | Leaky Window draught (−0.1°C) |
| Bathroom | Hot Water Bottle | Warm towel in the Airing Cupboard (+0.1°C) |
| Bedroom | Cardigan | |
| Loft | Bobble Hat | |
| Garden Shed | Logs for the Fire | |

The four corners:

- **Boiler Cupboard** (start): give it a thump. Half the time it kicks in (+0.3°C).
- **Open Window**: an icy blast (−0.3°C).
- **Stairlift**: ride it all the way down to the Boiler Cupboard.
- **Tiddles' Basket**: trip over the cat and miss a go.

As you deliver things, Grandad puts them on: slippers on his feet, the blanket and hot water bottle on his lap, the hat, scarf and cardigan, a cup of tea on the side table, and the logs light the fire. As he cools down he turns blue, shivers harder, grows an icicle on his nose, and frost creeps in from the edges of the board.

### How cold is it?

| Setting | Starts at | What changes |
| --- | --- | --- |
| Mild Autumn | 36.6°C | Slow chill, wide ducking window. Good for little ones. |
| Chilly Winter | 36.4°C | The proper game. |
| The Big Freeze | 36.2°C | Fast chill, tight ducking window. About a coin toss even with good play. |

With more players each go chills Grandad a little less, so the challenge stays about the same whether you play alone or with the whole family.

### Keys

| Key | Does |
| --- | --- |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Roll the dice, or duck |
| <kbd>←</kbd> / <kbd>→</kbd> | Go anticlockwise / clockwise (or click a flashing square) |
| <kbd>R</kbd> | Eat a custard cream and re-roll |
| <kbd>M</kbd> | Sound on or off |

All the sound effects are generated live in the browser, so there are no audio files.
